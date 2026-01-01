<script setup>
import { reactive, ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  mpiType: { type: String, default: 'openmpi' },
  hostfile: { type: String, default: '' },
  modelValue: { type: String, default: '' }, // rankfileText v-model
  externalTopology: { type: String, default: '' },
  defaultRanks: { type: Number, default: 4 },
  config: {
    type: Object,
    default: () => ({
      raw: '',
      policy: 'sequential',
      selectedCpus: [],
      manualAssignments: [],
      viewMode: 'socket'
    })
  }
});
const emit = defineEmits(['update:modelValue', 'update:config']);

const binding = reactive({
  raw: props.config.raw || '',
  policy: props.config.policy || 'sequential',
  ranks: props.defaultRanks,
  viewMode: props.config.viewMode || 'socket', // socket, node, flat
  parsedItems: []
});

watch(() => props.defaultRanks, (newVal) => {
  binding.ranks = newVal;
});

const selectedCpus = ref(props.config.selectedCpus ? [...props.config.selectedCpus] : []); // For auto policies
const manualAssignments = ref(new Map(props.config.manualAssignments || [])); // Map<Rank, CpuId> for manual policy

const parseCpuInfo = () => {
  const lines = (binding.raw || '').trim().split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) { binding.parsedItems = []; selectedCpus.value = []; return; }

  const headerLine = lines[0].toUpperCase();
  const cols_header = headerLine.split(/\s+/);
  
  // Find indices of required columns
  const idxCpu = cols_header.indexOf('CPU');
  const idxCore = cols_header.indexOf('CORE');
  const idxSocket = cols_header.indexOf('SOCKET');
  let idxNode = cols_header.indexOf('NODE');
  if (idxNode === -1) idxNode = cols_header.indexOf('DRAWER'); // Some systems use DRAWER or BOOK

  let dataLines = lines;
  if (idxCpu !== -1) dataLines = lines.slice(1);

  const items = [];
  for (const line of dataLines) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 3) continue;
    
    const cpu = idxCpu !== -1 ? parseInt(cols[idxCpu], 10) : parseInt(cols[0], 10);
    const core = idxCore !== -1 ? parseInt(cols[idxCore], 10) : parseInt(cols[1], 10);
    const socket = idxSocket !== -1 ? parseInt(cols[idxSocket], 10) : parseInt(cols[2], 10);
    const node = idxNode !== -1 ? parseInt(cols[idxNode], 10) : (idxSocket !== -1 ? parseInt(cols[idxSocket], 10) : 0);
    
    if (Number.isNaN(cpu)) continue;
    items.push({ cpu, core, socket, node });
  }
  binding.parsedItems = items;

  // Default selection
  if (!selectedCpus.value.length && items.length > 0) {
    selectedCpus.value = items.map(x => x.cpu);
  }
};

// Sync internal state to external config
watch([binding, selectedCpus, manualAssignments], () => {
  const newConfig = {
    raw: binding.raw,
    policy: binding.policy,
    selectedCpus: [...selectedCpus.value],
    manualAssignments: Array.from(manualAssignments.value.entries()),
    viewMode: binding.viewMode
  };
  
  // Only emit if something actually changed to prevent infinite loops
  if (JSON.stringify(newConfig) !== JSON.stringify(props.config)) {
    emit('update:config', newConfig);
  }
}, { deep: true });

// Sync external config to internal state (for when switching servers/loading)
watch(() => props.config, (newConfig) => {
  if (!newConfig) return;
  
  // Only update if values are different
  if (newConfig.raw !== undefined && newConfig.raw !== binding.raw) {
    binding.raw = newConfig.raw;
  }
  if (newConfig.policy !== undefined && newConfig.policy !== binding.policy) {
    binding.policy = newConfig.policy;
  }
  if (newConfig.viewMode !== undefined && newConfig.viewMode !== binding.viewMode) {
    binding.viewMode = newConfig.viewMode;
  }
  
  if (newConfig.selectedCpus) {
    const newSelected = [...newConfig.selectedCpus].sort((a, b) => a - b);
    const currentSelected = [...selectedCpus.value].sort((a, b) => a - b);
    if (JSON.stringify(newSelected) !== JSON.stringify(currentSelected)) {
      selectedCpus.value = newSelected;
    }
  }
  
  if (newConfig.manualAssignments) {
    const newMapArr = JSON.stringify(newConfig.manualAssignments.sort((a, b) => a[0] - b[0]));
    const currentMapArr = JSON.stringify(Array.from(manualAssignments.value.entries()).sort((a, b) => a[0] - b[0]));
    if (newMapArr !== currentMapArr) {
      manualAssignments.value = new Map(newConfig.manualAssignments);
    }
  }
  
  if (binding.raw && !binding.parsedItems.length) {
    parseCpuInfo();
  }
}, { deep: true, immediate: true });

// Drag state
const isDragging = ref(false);
const isSelecting = ref(true);
const dragSource = ref(null); // { type: 'rank'|'cpu', value: id }

// Grouping logic
const groupedCpus = computed(() => {
  if (!binding.parsedItems.length) return [];

  if (binding.viewMode === 'flat') {
    return [{
      key: 'flat',
      title: 'All CPUs',
      cores: new Set(binding.parsedItems.map(i => i.core)),
      cpus: [...binding.parsedItems].sort((a, b) => a.cpu - b.cpu)
    }];
  }

  const groups = new Map();
  for (const it of binding.parsedItems) {
    const key = binding.viewMode === 'node' ? `node-${it.node}` : `socket-${it.socket}`;
    const title = binding.viewMode === 'node' ? `NUMA Node ${it.node}` : `Socket ${it.socket}`;

    if (!groups.has(key)) {
      groups.set(key, { key, title, cores: new Set(), cpus: [] });
    }
    groups.get(key).cores.add(it.core);
    groups.get(key).cpus.push(it);
  }

  const result = [...groups.values()];
  result.forEach(g => g.cpus.sort((a, b) => a.cpu - b.cpu));
  return result.sort((a, b) => a.key.localeCompare(b.key));
});

// Selection Logic (Auto Policies)
const isCpuSelected = (cpuId) => selectedCpus.value.includes(cpuId);

const updateCpuState = (cpuId, shouldSelect) => {
  if (binding.policy === 'manual') return; // Disable selection in manual mode
  const idx = selectedCpus.value.indexOf(cpuId);
  if (shouldSelect && idx === -1) {
    selectedCpus.value.push(cpuId);
  } else if (!shouldSelect && idx !== -1) {
    selectedCpus.value.splice(idx, 1);
  }
  selectedCpus.value.sort((a, b) => a - b);
};

// Mouse Interaction
const onMouseDown = (cpuId) => {
  if (binding.policy === 'manual') return;
  isDragging.value = true;
  const currentlySelected = isCpuSelected(cpuId);
  isSelecting.value = !currentlySelected;
  updateCpuState(cpuId, isSelecting.value);
};

const onMouseEnter = (cpuId) => {
  if (binding.policy === 'manual') return;
  if (isDragging.value) {
    updateCpuState(cpuId, isSelecting.value);
  }
};

const onMouseUp = () => {
  isDragging.value = false;
  dragSource.value = null;
};

onMounted(() => window.addEventListener('mouseup', onMouseUp));
onUnmounted(() => window.removeEventListener('mouseup', onMouseUp));

// Quick Actions
const selectAll = () => {
  if (binding.policy === 'manual') return;
  selectedCpus.value = binding.parsedItems.map(c => c.cpu).sort((a, b) => a - b);
};

const clearSelection = () => {
  if (binding.policy === 'manual') {
    manualAssignments.value.clear();
  } else {
    selectedCpus.value = [];
  }
};

const invertSelection = () => {
  if (binding.policy === 'manual') return;
  const all = binding.parsedItems.map(c => c.cpu);
  const current = new Set(selectedCpus.value);
  selectedCpus.value = all.filter(c => !current.has(c)).sort((a, b) => a - b);
};

// Rank Assignment Logic
const assignRanksToCpus = () => {
  const np = binding.ranks || 1;
  const assignments = [];

  if (binding.policy === 'manual') {
    for (const [rank, cpu] of manualAssignments.value.entries()) {
      if (rank < np) { // Only include ranks within current np limit
        assignments.push({ rank, cpu });
      }
    }
    return assignments.sort((a, b) => a.rank - b.rank);
  }

  // Auto policies
  const cpus = [...selectedCpus.value];
  if (!cpus.length) return [];

  if (binding.policy === 'sequential') {
    for (let r = 0; r < np; r++) assignments.push({ rank: r, cpu: cpus[r % cpus.length] });
  } else {
    // Round robin (simple implementation based on sorted selection)
    // For true round-robin by socket/node, we'd need more complex logic using the parsed structure.
    // Here we just interleave even/odd if available, or just use the selection order which is sorted by CPU ID.
    // A better round-robin usually implies jumping between sockets.
    // Let's try to re-order cpus list to be round-robin across groups if possible.

    // Simple re-order for round-robin effect:
    // Take 1 from group A, 1 from group B, etc.
    const groups = groupedCpus.value.map(g => [...g.cpus.map(c => c.cpu).filter(id => cpus.includes(id))]);
    const orderedCpus = [];
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const g of groups) {
        if (g.length) {
          orderedCpus.push(g.shift());
          hasMore = true;
        }
      }
    }

    const pool = orderedCpus.length ? orderedCpus : cpus;
    for (let r = 0; r < np; r++) assignments.push({ rank: r, cpu: pool[r % pool.length] });
  }
  return assignments;
};

const cpuRankMap = computed(() => {
  const map = new Map();
  const assignments = assignRanksToCpus();
  for (const a of assignments) {
    if (!map.has(a.cpu)) map.set(a.cpu, []);
    map.get(a.cpu).push(a.rank);
  }
  return map;
});

const rankfileText = computed(() => {
  if (props.mpiType !== 'openmpi') return '';
  const assigns = assignRanksToCpus();
  if (!assigns.length) return '';
  const host = props.hostfile ? 'HOSTFILE' : 'localhost';
  return assigns.map((a) => `rank ${a.rank}=${host} slot=${a.cpu}`).join('\n');
});

watch(rankfileText, (v) => emit('update:modelValue', v));

watch(() => props.externalTopology, (newVal) => {
  if (newVal && !binding.raw) {
    binding.raw = newVal;
    parseCpuInfo();
  }
}, { immediate: true });

// Manual Drag & Drop Logic
const onDragStartRank = (ev, rank) => {
  if (binding.policy !== 'manual') return;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', JSON.stringify({ type: 'rank', value: rank }));
  dragSource.value = { type: 'rank', value: rank };
};

const onDragStartCpuRank = (ev, rank, cpuId) => {
  if (binding.policy !== 'manual') return;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', JSON.stringify({ type: 'rank', value: rank, fromCpu: cpuId }));
  dragSource.value = { type: 'rank', value: rank, fromCpu: cpuId };
};

const onDropOnCpu = (ev, cpuId) => {
  if (binding.policy !== 'manual') return;
  const data = JSON.parse(ev.dataTransfer.getData('text/plain'));
  if (data && data.type === 'rank') {
    manualAssignments.value.set(data.value, cpuId);
  }
};

const unassignedRanks = computed(() => {
  const np = binding.ranks || 1;
  const assigned = new Set(manualAssignments.value.keys());
  const list = [];
  for (let i = 0; i < np; i++) {
    if (!assigned.has(i)) list.push(i);
  }
  return list;
});

const removeRankFromCpu = (rank) => {
  if (binding.policy === 'manual') {
    manualAssignments.value.delete(rank);
  }
};
</script>

<template>
  <div>
    <h3>CPU Core Binding 助手</h3>
    <div class="form-group">
      <label>貼上 lscpu -e=CPU,CORE,SOCKET,NODE 的輸出</label>
      <textarea v-model="binding.raw" rows="6" placeholder="例如：\nCPU CORE SOCKET NODE\n0   0    0      0\n1   1    0      0\n..."></textarea>
    </div>
    <div class="inline">
      <div class="form-group">
        <label>分配策略</label>
        <select v-model="binding.policy">
          <option value="sequential">Sequential (依序填滿)</option>
          <option value="round-socket">Round-robin (交錯分配)</option>
          <option value="manual">Manual (手動拖曳)</option>
        </select>
      </div>
      <div class="form-group">
        <label>總 ranks (覆蓋 -np)</label>
        <input type="number" v-model.number="binding.ranks" min="1" placeholder="例如: 4" />
      </div>
    </div>

    <div class="actions-row">
      <div class="left-actions">
        <button class="copy-btn" @click="parseCpuInfo">解析 CPU 拓樸</button>
        <select v-if="binding.parsedItems.length" v-model="binding.viewMode" class="view-select">
          <option value="socket">View by Socket</option>
          <option value="node">View by NUMA Node</option>
          <option value="flat">Flat View</option>
        </select>
      </div>
      <div class="quick-actions" v-if="binding.parsedItems.length">
        <button class="action-btn" @click="selectAll" :disabled="binding.policy === 'manual'">全選</button>
        <button class="action-btn" @click="invertSelection" :disabled="binding.policy === 'manual'">反選</button>
        <button class="action-btn" @click="clearSelection">清除</button>
      </div>
    </div>

    <!-- Manual Mode Rank Palette -->
    <div v-if="binding.policy === 'manual' && binding.parsedItems.length" class="rank-palette">
      <label>未分配的 Ranks (拖曳至下方 CPU)</label>
      <div class="rank-pool">
        <div
          v-for="rank in unassignedRanks"
          :key="rank"
          class="rank-token"
          draggable="true"
          @dragstart="onDragStartRank($event, rank)"
        >
          R{{ rank }}
        </div>
        <span v-if="unassignedRanks.length === 0" class="empty-msg">所有 Rank 已分配</span>
      </div>
    </div>

    <div v-if="binding.parsedItems.length" style="margin-top: 1rem;">
      <div class="grid">
        <div class="card" v-for="group in groupedCpus" :key="group.key">
          <div class="card-header">
            <strong>{{ group.title }}</strong>
            <span class="note">cores: {{ group.cores.size }} | cpus: {{ group.cpus.length }}</span>
          </div>
          <div class="cpu-container">
            <div
              v-for="cpu in group.cpus"
              :key="cpu.cpu"
              class="cpu-slot"
              :class="{
                selected: isCpuSelected(cpu.cpu) && binding.policy !== 'manual',
                droppable: binding.policy === 'manual'
              }"
              @mousedown.prevent="onMouseDown(cpu.cpu)"
              @mouseenter="onMouseEnter(cpu.cpu)"
              @dragover.prevent
              @drop="onDropOnCpu($event, cpu.cpu)"
            >
              <span class="cpu-id">{{ cpu.cpu }}</span>

              <!-- Ranks assigned to this CPU -->
              <div class="cpu-ranks">
                <span
                  v-for="rank in (cpuRankMap.get(cpu.cpu) || [])"
                  :key="rank"
                  class="rank-badge"
                  :draggable="binding.policy === 'manual'"
                  @dragstart.stop="onDragStartCpuRank($event, rank, cpu.cpu)"
                  @click.stop="removeRankFromCpu(rank)"
                  title="點擊移除，拖曳移動"
                >
                  R{{ rank }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="form-group" style="margin-top: 1rem;">
        <label v-if="binding.policy !== 'manual'">已選 CPU 列表 (可拖曳選取)</label>
        <label v-else>手動分配模式</label>
        <input v-if="binding.policy !== 'manual'" type="text" :value="selectedCpus.join(',')" readonly />
        <small class="note" v-if="binding.policy !== 'manual'">提示：按住滑鼠左鍵並拖曳可快速選取/取消選取多個核心。</small>
        <small class="note" v-else>提示：將上方的 Rank 拖曳至 CPU 核心方塊中。點擊 CPU 上的 Rank 可移除。</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.card { border: 1px solid #30363d; padding: 12px; border-radius: 8px; background: #161b22; color: #e6e9ef; display: flex; flex-direction: column; }
.card-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; border-bottom: 1px solid #21262d; padding-bottom: 4px; }
.cpu-container { display: flex; flex-wrap: wrap; gap: 6px; }

.cpu-slot {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin: 0;
  padding: 4px;
  border-radius: 4px;
  border: 1px solid #30363d;
  cursor: pointer;
  background: #0d1117;
  color: #c9d1d9;
  font-size: 0.85rem;
  transition: all 0.1s;
  user-select: none;
  min-width: 40px;
  min-height: 40px;
}
.cpu-slot:hover { border-color: #8b949e; background: #21262d; }
.cpu-slot.selected { background: #1f6feb; color: #fff; border-color: #58a6ff; }
.cpu-slot.droppable { border-style: dashed; }

.cpu-id { font-size: 0.8em; opacity: 0.7; margin-bottom: 2px; }

.cpu-ranks { display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; }

.rank-badge {
  background: #e3b341;
  color: #000;
  font-size: 0.75em;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
  cursor: grab;
}
.rank-badge:active { cursor: grabbing; }

/* Manual Mode Palette */
.rank-palette {
  background: #161b22;
  border: 1px solid #30363d;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.rank-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  padding: 4px;
}
.rank-token {
  background: #238636;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.9rem;
  cursor: grab;
  border: 1px solid rgba(255,255,255,0.1);
}
.rank-token:active { cursor: grabbing; }
.empty-msg { color: #8b949e; font-size: 0.9rem; font-style: italic; padding: 4px; }

.note { font-size: 0.8rem; color: #8b949e; }

/* Form styles matching App.vue */
.form-group { margin-bottom: 16px; }
label { display: block; margin-bottom: 8px; color: #c9d1d9; font-weight: 500; font-size: 0.95rem; }
input[type='text'], input[type='number'], select, textarea {
  width: 100%; padding: 10px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6e9ef; font-size: 0.95rem; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s;
}
input:focus, select:focus, textarea:focus { outline: none; border-color: #58a6ff; box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15); }
.inline { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }

.actions-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px; }
.left-actions { display: flex; gap: 10px; align-items: center; }
.quick-actions { display: flex; gap: 8px; }

.view-select { width: auto !important; padding: 6px 24px 6px 10px !important; font-size: 0.85rem !important; }

.copy-btn { background: #238636; border: 1px solid rgba(240,246,252,0.1); color: #ffffff; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-weight: 500; }
.copy-btn:hover { background: #2ea043; }

.action-btn { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
.action-btn:hover { background: #30363d; color: #fff; border-color: #8b949e; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

h3 { color: #fff; margin-top: 0; margin-bottom: 16px; }
</style>
