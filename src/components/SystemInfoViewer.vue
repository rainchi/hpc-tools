<script setup>
import { computed, ref } from 'vue';
import LstopoGraph from './LstopoGraph.vue';

const props = defineProps({
  rawOutput: { type: String, default: '' },
});

const parsedData = computed(() => {
  let text = props.rawOutput.trim();
  if (!text) return null;

  if (!text.includes('===HPC_TOOLS_START===')) {
    try {
      text = atob(text.replace(/\s/g, ''));
    } catch (e) {
      // Not base64 or failed
    }
  }

  const sections = {};
  const lines = text.split(/\r?\n/);
  let currentSection = null;
  let buffer = [];

  for (const line of lines) {
    if (line.trim() === '===HPC_TOOLS_START===') continue;
    if (line.trim() === '===HPC_TOOLS_END===') continue;

    const match = line.match(/^---SECTION:(.+)---$/);
    if (match) {
      if (currentSection) {
        sections[currentSection] = buffer.join('\n').trim();
      }
      currentSection = match[1];
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (currentSection) {
    sections[currentSection] = buffer.join('\n').trim();
  }

  return sections;
});

const envVars = computed(() => {
  if (!parsedData.value || !parsedData.value.ENV) return [];
  return parsedData.value.ENV.split('\n').map(l => {
    const idx = l.indexOf('=');
    if (idx === -1) return null;
    return { key: l.substring(0, idx), value: l.substring(idx + 1) };
  }).filter(Boolean).sort((a, b) => a.key.localeCompare(b.key));
});

const pathVars = computed(() => {
  const path = envVars.value.find(e => e.key === 'PATH');
  if (!path) return [];
  return path.value.split(':');
});

const osInfo = computed(() => {
  if (!parsedData.value || !parsedData.value.OS) return {};
  const info = {};
  parsedData.value.OS.split('\n').forEach(l => {
    const [k, v] = l.split('=');
    if (k && v) info[k] = v.replace(/"/g, '');
  });
  return info;
});

// Lstopo XML Parsing
const lstopoData = computed(() => {
  if (!parsedData.value || !parsedData.value.LSTOPO) return null;
  const xmlStr = parsedData.value.LSTOPO;
  if (xmlStr.includes('LSTOPO_NOT_FOUND')) return null;

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, "text/xml");

    const parseNode = (xmlNode) => {
      if (xmlNode.nodeType !== 1) return null; // Element nodes only

      const obj = {
        type: xmlNode.getAttribute('type') || xmlNode.tagName,
        attr: {},
        children: []
      };

      // Attributes
      for (let i = 0; i < xmlNode.attributes.length; i++) {
        const attr = xmlNode.attributes[i];
        obj.attr[attr.name] = attr.value;
      }

      // Children
      for (let i = 0; i < xmlNode.childNodes.length; i++) {
        const child = parseNode(xmlNode.childNodes[i]);
        if (child) obj.children.push(child);
      }

      return obj;
    };

    const root = xmlDoc.querySelector('object[type="Machine"]');
    return root ? parseNode(root) : null;
  } catch (e) {
    console.error("Failed to parse lstopo XML", e);
    return null;
  }
});

const lstopoMissing = computed(() => {
  return parsedData.value && parsedData.value.LSTOPO && parsedData.value.LSTOPO.includes('LSTOPO_NOT_FOUND');
});

const nvidiaGpuInfo = computed(() => {
  if (!parsedData.value || !parsedData.value.NVIDIA_GPU) return null;
  const xmlStr = parsedData.value.NVIDIA_GPU;
  if (xmlStr.includes('NVIDIA_SMI_NOT_FOUND')) return null;
  // Check if it looks like XML
  if (!xmlStr.trim().startsWith('<?xml') && !xmlStr.trim().startsWith('<nvidia_smi_log')) return null;

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
    const gpus = xmlDoc.querySelectorAll('gpu');
    const result = [];

    gpus.forEach(gpu => {
      const getText = (selector) => gpu.querySelector(selector)?.textContent?.trim() || 'N/A';

      result.push({
        id: gpu.getAttribute('id'),
        name: getText('product_name'),
        uuid: getText('uuid'),
        fan: getText('fan_speed'),
        temp: getText('temperature > gpu_temp'),
        power: {
          draw: getText('gpu_power_readings > instant_power_draw'),
          limit: getText('gpu_power_readings > power_limit') || getText('gpu_power_readings > default_power_limit')
        },
        memory: {
          total: getText('fb_memory_usage > total'),
          used: getText('fb_memory_usage > used'),
          free: getText('fb_memory_usage > free')
        },
        util: {
          gpu: getText('utilization > gpu_util'),
          mem: getText('utilization > memory_util')
        },
        pci: {
          gen: getText('pci > pci_gpu_link_info > pcie_gen > current_link_gen'),
          width: getText('pci > pci_gpu_link_info > link_widths > current_link_width'),
          busId: getText('pci > pci_bus_id')
        },
        clocks: {
          graphics: getText('clocks > graphics_clock'),
          mem: getText('clocks > mem_clock')
        },
        driver: xmlDoc.querySelector('driver_version')?.textContent?.trim(),
        cuda: xmlDoc.querySelector('cuda_version')?.textContent?.trim()
      });
    });
    return result;
  } catch (e) {
    console.error("Failed to parse NVIDIA XML", e);
    return null;
  }
});

const installTab = ref('apt');

// Topology Parsing
const topology = computed(() => {
  if (!parsedData.value || !parsedData.value.CPU_TOPOLOGY) return null;

  const lines = parsedData.value.CPU_TOPOLOGY.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;

  // Parse header to find column indices
  const header = lines[0].trim().split(/\s+/);
  const colMap = {};
  header.forEach((col, idx) => {
    colMap[col.toUpperCase()] = idx;
  });

  if (colMap['CPU'] === undefined) return null;

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].trim().split(/\s+/);
    const item = {};
    for (const [key, idx] of Object.entries(colMap)) {
      item[key] = cols[idx];
    }
    items.push(item);
  }

  // Build Hierarchy: Node -> Socket -> Core -> CPU (Thread)
  // Handle missing columns by defaulting to '0'
  const nodes = new Map();

  items.forEach(item => {
    const nodeId = item['NODE'] || '0';
    const socketId = item['SOCKET'] || '0';
    const coreId = item['CORE'] || '0';
    const cpuId = item['CPU'];

    if (!nodes.has(nodeId)) {
      nodes.set(nodeId, { id: nodeId, sockets: new Map() });
    }
    const node = nodes.get(nodeId);

    if (!node.sockets.has(socketId)) {
      node.sockets.set(socketId, { id: socketId, cores: new Map() });
    }
    const socket = node.sockets.get(socketId);

    if (!socket.cores.has(coreId)) {
      socket.cores.set(coreId, { id: coreId, cpus: [] });
    }
    const core = socket.cores.get(coreId);

    core.cpus.push(cpuId);
  });

  // Convert Maps to Arrays and sort
  return Array.from(nodes.values()).map(node => {
    return {
      id: node.id,
      sockets: Array.from(node.sockets.values()).map(socket => {
        return {
          id: socket.id,
          cores: Array.from(socket.cores.values()).map(core => {
            return {
              id: core.id,
              cpus: core.cpus.sort((a, b) => parseInt(a) - parseInt(b))
            };
          }).sort((a, b) => parseInt(a.id) - parseInt(b.id))
        };
      }).sort((a, b) => parseInt(a.id) - parseInt(b.id))
    };
  }).sort((a, b) => parseInt(a.id) - parseInt(b.id));
});

const memInfo = computed(() => {
  if (!parsedData.value || !parsedData.value.MEM) return null;
  const lines = parsedData.value.MEM.split(/\r?\n/);
  const memLine = lines.find(l => l.startsWith('Mem:'));
  if (!memLine) return null;
  const parts = memLine.split(/\s+/);
  // free -h output: Mem: total used free shared buff/cache available
  // indices: 0:Mem:, 1:total, 2:used, 3:free, 4:shared, 5:buff/cache, 6:available
  if (parts.length < 7) return null;
  return {
    total: parts[1],
    used: parts[2],
    free: parts[3],
    available: parts[6]
  };
});

const activeTab = ref('summary');
</script>

<template>
  <div class="sysinfo-viewer">
    <div v-if="!parsedData" class="empty-state">
      <p>請將上方產生的指令在 HPC 環境執行，並將輸出結果貼至下方欄位。</p>
    </div>

    <div v-else class="dashboard">
      <div class="tabs">
        <button :class="{ active: activeTab === 'summary' }" @click="activeTab = 'summary'">Summary</button>
        <button :class="{ active: activeTab === 'cpu' }" @click="activeTab = 'cpu'">CPU & Mem</button>
        <button :class="{ active: activeTab === 'gpu' }" @click="activeTab = 'gpu'">GPU</button>
        <button :class="{ active: activeTab === 'env' }" @click="activeTab = 'env'">Environment</button>
        <button :class="{ active: activeTab === 'modules' }" @click="activeTab = 'modules'">Modules & Slurm</button>
        <button :class="{ active: activeTab === 'raw' }" @click="activeTab = 'raw'">Raw Data</button>
      </div>

      <div class="tab-content">
        <!-- Summary Tab -->
        <div v-if="activeTab === 'summary'" class="grid-layout">
          <div class="card">
            <h3>System</h3>
            <div class="kv-list">
              <div class="kv-item">
                <span class="key">OS</span>
                <span class="value">{{ osInfo.PRETTY_NAME || 'Unknown' }}</span>
              </div>
              <div class="kv-item">
                <span class="key">Kernel</span>
                <span class="value">{{ parsedData.KERNEL }}</span>
              </div>
            </div>
          </div>
          <div class="card" v-if="parsedData.GPU || parsedData.NVIDIA_GPU || parsedData.AMD_GPU">
            <h3>Hardware Summary</h3>
            <div class="kv-list">
              <div class="kv-item" v-if="parsedData.GPU">
                <span class="key">GPU (Legacy)</span>
                <pre class="value-block">{{ parsedData.GPU }}</pre>
              </div>
              <div class="kv-item" v-if="parsedData.NVIDIA_GPU">
                 <span class="key">NVIDIA GPU</span>
                 <span class="value">{{ parsedData.NVIDIA_GPU.includes('NVIDIA_SMI_NOT_FOUND') ? 'Not Found' : 'Detected' }}</span>
              </div>
              <div class="kv-item" v-if="parsedData.AMD_GPU">
                 <span class="key">AMD GPU</span>
                 <span class="value">{{ parsedData.AMD_GPU.includes('ROCM_SMI_NOT_FOUND') ? 'Not Found' : 'Detected' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CPU Tab (Topology View) -->
        <div v-if="activeTab === 'cpu'" class="grid-layout">
          <!-- Memory Summary -->
          <div class="card full-width" v-if="memInfo">
            <h3>Memory Usage</h3>
            <div class="mem-bar-container">
              <div class="mem-stats">
                <span>Total: <strong>{{ memInfo.total }}</strong></span>
                <span>Used: <strong>{{ memInfo.used }}</strong></span>
                <span>Free: <strong>{{ memInfo.free }}</strong></span>
                <span>Available: <strong>{{ memInfo.available }}</strong></span>
              </div>
              <div class="mem-bar">
                <!-- Visual bar could be added here if we parse units to % -->
              </div>
            </div>
            <pre class="code-block" style="margin-top: 8px;">{{ parsedData.MEM }}</pre>
          </div>

          <!-- Topology Visualization -->
          <div class="card full-width" v-if="lstopoData">
            <h3>Hardware Topology (lstopo)</h3>
            <div class="topo-container">
              <LstopoGraph :node="lstopoData" />
            </div>
          </div>

          <div class="card full-width" v-else-if="lstopoMissing">
            <h3>Hardware Topology</h3>
            <div class="install-guide">
              <p class="warning-text">⚠️ 系統未安裝 <code>lstopo</code> (hwloc)，無法顯示詳細硬體拓樸圖。</p>
              <p>建議安裝 hwloc 以獲得最佳視覺化效果：</p>

              <div class="install-tabs">
                <button :class="{ active: installTab === 'apt' }" @click="installTab = 'apt'">Ubuntu/Debian (apt)</button>
                <button :class="{ active: installTab === 'source' }" @click="installTab = 'source'">Source Code</button>
              </div>

              <div v-if="installTab === 'apt'" class="install-content">
                <pre class="code-block">sudo apt-get update
sudo apt-get install hwloc</pre>
              </div>

              <div v-if="installTab === 'source'" class="install-content">
                <pre class="code-block"># 下載並編譯 hwloc (需有編譯器)
wget https://download.open-mpi.org/release/hwloc/v2.9/hwloc-2.9.3.tar.bz2
tar xf hwloc-2.9.3.tar.bz2
cd hwloc-2.9.3
./configure --prefix=$HOME/local/hwloc
make -j$(nproc)
make install

# 加入 PATH
export PATH=$HOME/local/hwloc/bin:$PATH
export LD_LIBRARY_PATH=$HOME/local/hwloc/lib:$LD_LIBRARY_PATH</pre>
              </div>
            </div>
          </div>

          <div class="card full-width" v-else-if="topology">
            <h3>CPU Topology (lscpu -e)</h3>
            <div class="topo-container">
              <div class="machine-box">
                <div class="box-label">Machine</div>
                <div class="topo-nodes">
                  <div v-for="node in topology" :key="node.id" class="node-box">
                    <div class="box-label">NUMA Node {{ node.id }}</div>
                    <div class="topo-sockets">
                      <div v-for="socket in node.sockets" :key="socket.id" class="socket-box">
                        <div class="box-label">Package {{ socket.id }}</div>
                        <div class="topo-cores">
                          <div v-for="core in socket.cores" :key="core.id" class="core-box">
                            <div class="box-label">Core {{ core.id }}</div>
                            <div class="topo-threads">
                              <div v-for="cpu in core.cpus" :key="cpu" class="thread-box" title="Logical CPU">
                                PU {{ cpu }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Fallback or Raw CPU Info -->
          <div class="card full-width" v-if="(!topology && !lstopoData) || parsedData.CPU_SUMMARY">
            <h3>CPU Info (lscpu)</h3>
            <pre class="code-block">{{ parsedData.CPU_SUMMARY || parsedData.CPU }}</pre>
          </div>
        </div>

        <!-- GPU Tab -->
        <div v-if="activeTab === 'gpu'" class="grid-layout">
          <div class="card full-width" v-if="parsedData.NVIDIA_GPU">
            <h3>NVIDIA GPU (nvidia-smi)</h3>
            <div v-if="parsedData.NVIDIA_GPU.includes('NVIDIA_SMI_NOT_FOUND')" class="warning-text">
              ⚠️ <code>nvidia-smi</code> command not found.
            </div>

            <!-- Parsed NVIDIA View -->
            <div v-else-if="nvidiaGpuInfo" class="gpu-container">
              <div v-for="(gpu, idx) in nvidiaGpuInfo" :key="idx" class="gpu-card">
                <div class="gpu-header">
                  <span class="gpu-model">{{ gpu.name }}</span>
                  <span class="gpu-busid">{{ gpu.pci.busId }}</span>
                </div>

                <div class="gpu-stats-grid">
                  <div class="stat-item">
                    <span class="stat-label">Utilization</span>
                    <div class="stat-val-group">
                      <span>GPU: <strong :class="parseInt(gpu.util.gpu) > 80 ? 'text-danger' : ''">{{ gpu.util.gpu }}</strong></span>
                      <span>Mem: <strong>{{ gpu.util.mem }}</strong></span>
                    </div>
                  </div>

                  <div class="stat-item">
                    <span class="stat-label">Memory</span>
                    <div class="stat-val-group">
                      <span>{{ gpu.memory.used }} / {{ gpu.memory.total }}</span>
                    </div>
                    <div class="mini-bar-bg">
                      <div class="mini-bar-fill" :style="{ width: (parseInt(gpu.memory.used) / parseInt(gpu.memory.total) * 100) + '%' }"></div>
                    </div>
                  </div>

                  <div class="stat-item">
                    <span class="stat-label">Power / Temp</span>
                    <div class="stat-val-group">
                      <span>{{ gpu.power.draw }} / {{ gpu.power.limit }}</span>
                      <span :class="parseInt(gpu.temp) > 80 ? 'text-danger' : ''">{{ gpu.temp }}</span>
                    </div>
                  </div>

                  <div class="stat-item">
                    <span class="stat-label">PCIe Link</span>
                    <div class="stat-val-group">
                      <span>Gen{{ gpu.pci.gen }} x{{ gpu.pci.width }}</span>
                    </div>
                  </div>

                  <div class="stat-item">
                    <span class="stat-label">Clocks</span>
                    <div class="stat-val-group">
                      <span>{{ gpu.clocks.graphics }}</span>
                    </div>
                  </div>

                  <div class="stat-item">
                    <span class="stat-label">Fan</span>
                    <div class="stat-val-group">
                      <span>{{ gpu.fan }}</span>
                    </div>
                  </div>
                </div>

                <div class="gpu-footer">
                  <small>Driver: {{ gpu.driver }} | CUDA: {{ gpu.cuda }} | UUID: {{ gpu.uuid }}</small>
                </div>
              </div>
            </div>

            <!-- Fallback Raw View -->
            <pre v-else class="code-block">{{ parsedData.NVIDIA_GPU }}</pre>
          </div>
          <div class="card full-width" v-if="parsedData.AMD_GPU">
            <h3>AMD GPU (rocm-smi)</h3>
            <div v-if="parsedData.AMD_GPU.includes('ROCM_SMI_NOT_FOUND')" class="warning-text">
              ⚠️ <code>rocm-smi</code> command not found.
            </div>
            <pre v-else class="code-block">{{ parsedData.AMD_GPU }}</pre>
          </div>
          <div class="card full-width" v-if="parsedData.GPU">
             <h3>GPU Summary (Legacy)</h3>
             <pre class="code-block">{{ parsedData.GPU }}</pre>
          </div>
           <div class="card full-width" v-if="!parsedData.NVIDIA_GPU && !parsedData.AMD_GPU && !parsedData.GPU">
             <h3>No GPU Data Found</h3>
             <p>No GPU sections found in the output. Please ensure you selected GPU collection options and the tools (nvidia-smi/rocm-smi) are available.</p>
          </div>
        </div>

        <!-- Env Tab -->
        <div v-if="activeTab === 'env'" class="grid-layout">
          <div class="card full-width">
            <h3>PATH Variable</h3>
            <ul class="path-list">
              <li v-for="(p, i) in pathVars" :key="i">{{ p }}</li>
            </ul>
          </div>
          <div class="card full-width">
            <h3>All Environment Variables</h3>
            <div class="env-table-wrapper">
              <table class="env-table">
                <thead><tr><th>Key</th><th>Value</th></tr></thead>
                <tbody>
                  <tr v-for="v in envVars" :key="v.key">
                    <td class="env-key">{{ v.key }}</td>
                    <td class="env-val">{{ v.value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Modules Tab -->
        <div v-if="activeTab === 'modules'" class="grid-layout">
          <div class="card">
            <h3>Loaded Modules</h3>
            <pre class="code-block">{{ parsedData.MODULES }}</pre>
          </div>
          <div class="card" v-if="parsedData.SLURM_PARTITIONS">
            <h3>Slurm Partitions</h3>
            <pre class="code-block">{{ parsedData.SLURM_PARTITIONS }}</pre>
          </div>
          <div class="card" v-if="parsedData.SLURM_ACCOUNTS">
            <h3>Slurm Accounts</h3>
            <pre class="code-block">{{ parsedData.SLURM_ACCOUNTS }}</pre>
          </div>
          <div class="card" v-if="parsedData.SLURM_QOS">
            <h3>Slurm QoS</h3>
            <pre class="code-block">{{ parsedData.SLURM_QOS }}</pre>
          </div>
          <div class="card" v-if="parsedData.SLURM">
            <h3>Slurm Version</h3>
            <pre class="code-block">{{ parsedData.SLURM }}</pre>
          </div>
          <div class="card full-width">
            <h3>System Limits (ulimit -a)</h3>
            <pre class="code-block">{{ parsedData.LIMITS }}</pre>
          </div>
        </div>

        <!-- Raw Tab -->
        <div v-if="activeTab === 'raw'" class="card full-width">
          <pre class="code-block">{{ props.rawOutput }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sysinfo-viewer {
  margin-top: 20px;
}

.empty-state {
  color: #8b949e;
  text-align: center;
  padding: 20px;
  border: 1px dashed #30363d;
  border-radius: 8px;
}

.tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 16px;
  border-bottom: 1px solid #30363d;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.tabs::-webkit-scrollbar {
  height: 4px;
}

.tabs::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 2px;
}

.tabs button {
  background: transparent;
  border: none;
  color: #8b949e;
  padding: 8px 16px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tabs button:hover {
  color: #c9d1d9;
}

.tabs button.active {
  color: #58a6ff;
  border-bottom-color: #58a6ff;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
}

.full-width {
  grid-column: 1 / -1;
}

h3 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #c9d1d9;
  font-size: 1rem;
  border-bottom: 1px solid #21262d;
  padding-bottom: 8px;
}

.kv-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kv-item {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #21262d;
  padding-bottom: 4px;
}

.key {
  color: #8b949e;
  font-weight: 500;
}

.value {
  color: #e6e9ef;
  font-family: monospace;
}

.value-block {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
  color: #e6e9ef;
}

.code-block {
  background: #0d1117;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.9rem;
  color: #e6e9ef;
  margin: 0;
}

.path-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: monospace;
}

.path-list li {
  padding: 4px 8px;
  border-bottom: 1px solid #21262d;
  word-break: break-all;
}

.env-table-wrapper {
  overflow-x: auto;
}

.env-table {
  width: 100%;
  border-collapse: collapse;
  font-family: monospace;
  font-size: 0.9rem;
}

.env-table th {
  text-align: left;
  color: #8b949e;
  padding: 8px;
  border-bottom: 1px solid #30363d;
}

.env-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #21262d;
  vertical-align: top;
}

.env-key {
  color: #79c0ff;
  font-weight: 600;
  white-space: nowrap;
}

.env-val {
  color: #e6e9ef;
  word-break: break-all;
}

/* Topology Visualization Styles */
.topo-container {
  overflow-x: auto;
  padding: 8px 0;
}

.machine-box {
  border: 2px solid #30363d;
  padding: 10px;
  border-radius: 6px;
  background: #0d1117;
  display: inline-block;
  min-width: 100%;
  box-sizing: border-box;
}

.box-label {
  font-size: 0.8rem;
  color: #8b949e;
  margin-bottom: 6px;
  font-weight: bold;
  text-transform: uppercase;
}

.topo-nodes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.node-box {
  border: 1px solid #1f6feb;
  padding: 8px;
  border-radius: 4px;
  background: rgba(31, 111, 235, 0.05);
  flex: 1;
  min-width: 200px;
}

.topo-sockets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.socket-box {
  border: 1px solid #d29922;
  padding: 6px;
  border-radius: 4px;
  background: rgba(210, 153, 34, 0.05);
  flex: 1;
}

.topo-cores {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.core-box {
  border: 1px solid #3fb950;
  padding: 4px;
  border-radius: 3px;
  background: rgba(63, 185, 80, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.topo-threads {
  display: flex;
  gap: 2px;
}

.thread-box {
  background: #238636;
  color: #fff;
  font-size: 0.7rem;
  padding: 2px 4px;
  border-radius: 2px;
  min-width: 24px;
  text-align: center;
}

.mem-stats {
  display: flex;
  gap: 16px;
  font-family: monospace;
  color: #e6e9ef;
  flex-wrap: wrap;
}

.mem-stats strong {
  color: #79c0ff;
}

.install-guide {
  padding: 8px;
}

.warning-text {
  color: #d29922;
  margin-bottom: 12px;
}

.install-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.install-tabs button {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.install-tabs button.active {
  background: #1f6feb;
  color: #fff;
  border-color: #58a6ff;
}

.install-content .code-block {
  background: #0d1117;
  border: 1px solid #30363d;
}

/* GPU Card Styles */
.gpu-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gpu-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 12px;
}

.gpu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid #30363d;
  padding-bottom: 8px;
}

.gpu-model {
  font-weight: bold;
  color: #7ee787;
  font-size: 1.1rem;
}

.gpu-busid {
  font-family: monospace;
  color: #8b949e;
  font-size: 0.9rem;
}

.gpu-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.75rem;
  color: #8b949e;
  text-transform: uppercase;
}

.stat-val-group {
  display: flex;
  flex-direction: column;
  font-family: monospace;
  font-size: 0.9rem;
  color: #e6e9ef;
}

.text-danger {
  color: #ff7b72;
}

.mini-bar-bg {
  height: 4px;
  background: #30363d;
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.mini-bar-fill {
  height: 100%;
  background: #1f6feb;
}

.gpu-footer {
  font-size: 0.75rem;
  color: #8b949e;
  border-top: 1px solid #30363d;
  padding-top: 8px;
}
</style>

