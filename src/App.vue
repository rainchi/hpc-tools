<script setup>
import { reactive, computed, ref, watch } from 'vue';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { buildMpiCmd, buildNsysCmd, buildNcuCmd, buildSlurmScript, buildSrunCmd, buildArrayScript, buildTransferCmd, buildModulesCmd, buildPerfCmd, buildValgrindCmd, buildCudaMemcheckCmd, buildSysInfoCmd, buildApptainerCmd, buildCompileCmd, buildNvprofCmd, buildRocprofCmd, buildHipccCmd } from './utils/builders';
import { HPL_PARAMETERS } from './utils/hpl';
import CpuBinding from './components/CpuBinding.vue';
import SystemInfoViewer from './components/SystemInfoViewer.vue';
import ApptainerBuilder from './components/ApptainerBuilder.vue';
import HplConfigBuilder from './components/HplConfigBuilder.vue';
import OsuBenchmarkBuilder from './components/OsuBenchmarkBuilder.vue';
import StreamBenchmarkBuilder from './components/StreamBenchmarkBuilder.vue';
import FioBenchmarkBuilder from './components/FioBenchmarkBuilder.vue';
import PbsToSlurmConverter from './components/PbsToSlurmConverter.vue';
import CustomSelect from './components/CustomSelect.vue';
import Combobox from './components/Combobox.vue';

// State
const mode = ref('mpi');

const mpi = reactive({
  type: 'openmpi',
  np: 4,
  ppn: 2,
  hostfile: '',
  showMap: false,
  byNode: false,
  bindToCore: false,
  omp: 1,
  envExtra: '',
  executable: './main',
  // Persistent binding state
  bindingConfig: {
    raw: '',
    policy: 'sequential',
    selectedCpus: [],
    manualAssignments: [], // Store as array of [rank, cpu] for JSON compatibility
    viewMode: 'socket'
  },
  rankfileText: ''
});

const compile = reactive({
  compiler: 'gcc',
  output: 'app.out',
  src: 'main.c',
  optimization: '-O3',
  march: 'native',
  openmp: false,
  libraries: [],
  customFlags: '',
});

const nvprof = reactive({
  output: 'output.nvvp',
  printSummary: true,
  printGpuTrace: false,
  executable: './cuda_main',
});

const nsys = reactive({
  output: 'profile',
  summary: true,
  sample: false,
  executable: './cuda_app',
  selectedTraces: [],
});

const ncu = reactive({
  output: 'report.ncu-rep',
  set: 'full',
  kernelRegex: '.*',
  executable: './cuda_app',
});

const rocprof = reactive({
  output: 'results.csv',
  stats: true,
  hipTrace: true,
  roctxTrace: false,
  timestamp: true,
  executable: './hip_app',
});

const hipcc = reactive({
  output: 'app.out',
  src: 'main.cpp',
  optimization: '-O3',
  offloadArch: 'gfx90a',
  openmp: false,
  customFlags: '',
});

const slurm = reactive({
  jobName: 'myjob',
  partition: '',
  account: '',
  time: '01:00:00',
  nodes: 1,
  ntasksPerNode: 4,
  omp: 1,
  gpusPerNode: 0,
  modules: '',
  env: 'OMP_NUM_THREADS=1',
  run: 'mpirun -np 4 ./a.out',
  scriptName: 'run.slurm',
});

const slurmAdv = reactive({
  mem: '',
  qos: '',
  gpuBind: '',
  constraint: '',
  exclusive: false,
  profile: false,
});

const slurmArray = reactive({
  range: '0-9%2',
  outFmt: '%x.%A.%a.out',
  errFmt: '%x.%A.%a.err',
  run: './run.sh ${SLURM_ARRAY_TASK_ID}',
  scriptName: 'array.slurm',
});

const hpl = reactive({});
// Initialize HPL config with defaults
HPL_PARAMETERS.forEach(p => {
  hpl[p.key] = Array.isArray(p.default) ? [...p.default] : p.default;
});

const hplMem = reactive({
  memoryGB: 16,
  usageRatio: 0.8,
  memoryType: 'cpu',
  gpuCount: 1
});

const osu = reactive({
  category: 'pt2pt',
  benchmark: 'osu_latency',
  device: 'cpu',
  mpiPath: ''
});

const handleOsuSendToMpi = (cmd) => {
  mpi.executable = cmd;
  mode.value = 'mpi';
  showToast('已將 OSU 指令填入 MPI Runner');
};

const handleOsuSendToSlurm = (cmd) => {
  slurm.run = `mpirun -np ${slurm.nodes * slurm.ntasksPerNode} ${cmd}`;
  mode.value = 'slurm';
  showToast('已將 OSU 指令填入 Slurm 腳本');
};

const handleStreamSendToSlurm = (cmd) => {
  slurm.run = cmd;
  mode.value = 'slurm';
  showToast('已將 STREAM 指令填入 Slurm 腳本');
};

const handleFioSendToSlurm = (cmd) => {
  slurm.run = cmd;
  mode.value = 'slurm';
  showToast('已將 FIO 指令填入 Slurm 腳本');
};

const copyHelloCode = () => {
  const code = `cat <<EOF > mpi_hello.c
#include <mpi.h>
#include <stdio.h>

int main(int argc, char** argv) {
    MPI_Init(NULL, NULL);
    int world_size, world_rank, name_len;
    char processor_name[MPI_MAX_PROCESSOR_NAME];
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);
    MPI_Get_processor_name(processor_name, &name_len);
    printf("Hello world from processor %s, rank %d out of %d processors\\n", processor_name, world_rank, world_size);
    MPI_Finalize();
    return 0;
}
EOF`;
  navigator.clipboard.writeText(code).then(() => {
    showToast('已複製建立指令！請在終端機貼上執行。');
  });
};

const transfer = reactive({
  src: './data/',
  dst: 'user@server:/path/',
  useRsync: true,
  compress: true,
  progress: true,
  archive: true,
  checksum: true,
  delete: false,
});

const modules = reactive({
  load: '',
  unload: '',
  availOutput: '',
  selected: [],
  filter: '',
});

const availableModules = computed(() => {
  if (!modules.availOutput) return [];
  const text = modules.availOutput;

  // Split by whitespace to handle both single-line and multi-line output
  const tokens = text.split(/\s+/);
  const groups = {};

  tokens.forEach(t => {
    t = t.trim();
    if (!t) return;
    if (t.endsWith(':')) return; // Path header
    if (t.startsWith('---')) return; // Separator
    if (t === '->') return; // Alias arrow

    let m = t.replace(/\(default\)$/, '').replace(/\(D\)$/, '').replace(/\(L\)$/, '');

    const slashIdx = m.indexOf('/');
    if (slashIdx > -1) {
        const pkg = m.substring(0, slashIdx);
        const ver = m.substring(slashIdx + 1);

        if (!groups[pkg]) groups[pkg] = new Set();
        if (ver) groups[pkg].add(ver);
    } else {
        // No slash
        if (!groups[m]) groups[m] = new Set();
        groups[m].add(''); // Represents the package itself
    }
  });

  return Object.keys(groups).sort().map(pkg => {
      return {
          name: pkg,
          versions: Array.from(groups[pkg]).sort()
      };
  });
});

const filteredModules = computed(() => {
    const all = availableModules.value;
    if (!modules.filter) return all;

    const q = modules.filter.toLowerCase();
    return all.map(pkg => {
        if (pkg.name.toLowerCase().includes(q)) return pkg;

        const matchingVers = pkg.versions.filter(v => v.toLowerCase().includes(q));
        if (matchingVers.length) {
            return { name: pkg.name, versions: matchingVers };
        }
        return null;
    }).filter(Boolean);
});

const perf = reactive({
  freq: 999,
  callGraph: 'dwarf',
  output: 'perf.data',
  executable: './app',
});

const valgrind = reactive({
  tool: 'memcheck',
  leak: 'full',
  logFmt: 'valgrind.%p.log',
  executable: './app',
});

const cudaMem = reactive({
  tool: 'memcheck',
  executable: './cuda_app',
});

const sysinfo = reactive({
  useBase64: false,
  rawOutput: '',
  collectOs: true,
  collectCpu: true,
  collectMem: true,
  collectEnv: true,
  collectLstopo: true,
  collectNvidia: true,
  collectAmd: false,
  collectSlurm: false,
});

const slurmData = reactive({
  partitions: [],
  accounts: [],
  qos: [],
  fetched: false,
  partitionLimits: {}
});

const cpuTopologyRaw = ref('');

watch(() => sysinfo.rawOutput, (newVal) => {
  if (!newVal) return;
  let text = newVal.trim();
  if (!text.includes('===HPC_TOOLS_START===')) {
    try {
      text = atob(text.replace(/\s/g, ''));
    } catch (e) { }
  }

  if (text.includes('---SECTION:CPU_TOPOLOGY---')) {
    const cpuMatch = text.match(/---SECTION:CPU_TOPOLOGY---([\s\S]*?)(---SECTION|$)/);
    if (cpuMatch) {
      cpuTopologyRaw.value = cpuMatch[1].trim();
    }
  }

  if (text.includes('---SECTION:SLURM_PARTITIONS---')) {
    const partMatch = text.match(/---SECTION:SLURM_PARTITIONS---([\s\S]*?)(---SECTION|$)/);
    if (partMatch) {
      const parts = partMatch[1].trim().split(/\r?\n/).filter(l => l && l !== 'SINFO_FAILED');
      // parts expected as "PARTITION|TIMELIMIT" (TIMELIMIT may be empty or UNLIMITED)
      const cleaned = parts.map(p => p.replace('*', ''));
      slurmData.partitions = cleaned.map(p => p.split('|')[0]);
      const limits = {};
      cleaned.forEach(p => {
        const [name, limit] = p.split('|');
        if (name) limits[name] = (limit || '').trim();
      });
      slurmData.partitionLimits = limits;
      slurmData.fetched = true;
    }
  }

  if (text.includes('---SECTION:SLURM_ACCOUNTS---')) {
    const accMatch = text.match(/---SECTION:SLURM_ACCOUNTS---([\s\S]*?)(---SECTION|$)/);
    if (accMatch) {
      const accs = accMatch[1].trim().split(/\r?\n/).filter(l => l && l !== 'SACCTMGR_FAILED');
      slurmData.accounts = accs.map(a => a.split('|')[0]);
      slurmData.fetched = true;
    }
  }

  if (text.includes('---SECTION:SLURM_QOS---')) {
    const qosMatch = text.match(/---SECTION:SLURM_QOS---([\s\S]*?)(---SECTION|$)/);
    if (qosMatch) {
      const qosList = qosMatch[1].trim().split(/\r?\n/).filter(l => l && l !== 'SACCTMGR_FAILED');
      slurmData.qos = qosList.map(q => q.split('|')[0]);
      slurmData.fetched = true;
    }
  }
});

const apptainer = reactive({
  command: 'exec',
  image: 'image.sif',
  options: '',
  binds: '',
  writable: false,
  nv: false,
  rocm: false,
  executable: './app',
});

const onSysInfoPaste = (event) => {
  const text = event.clipboardData.getData('text');
  if (!text) return;

  // If the text is NOT explicitly our format (plain text), try to decode it
  if (!text.includes('===HPC_TOOLS_START===')) {
    try {
      const decoded = atob(text.replace(/\s/g, ''));
      if (decoded.includes('===HPC_TOOLS_START===')) {
        event.preventDefault();
        sysinfo.rawOutput = decoded;
      }
    } catch (e) {
      // Ignore errors, let default paste handle it
    }
  }
};

const showSlurmPreview = ref(false);
const showSrunPreview = ref(false);

// Sidebar state and search
const sidebarCollapsed = ref(false);
const mobileMenuOpen = ref(false);
const searchQuery = ref('');

// Toast state
const toast = reactive({
  show: false,
  message: '',
  type: 'info'
});

const showToast = (msg, type = 'info') => {
  toast.message = msg;
  toast.type = type;
  toast.show = true;
  setTimeout(() => {
    toast.show = false;
  }, 3000);
};

// Modal state
const modal = reactive({
  show: false,
  title: '',
  message: '',
  inputValue: '',
  showInput: false,
  confirmText: '確定',
  cancelText: '取消',
  onConfirm: null,
  isDanger: false
});

const openModal = (opts) => {
  modal.title = opts.title || '提示';
  modal.message = opts.message || '';
  modal.inputValue = opts.defaultValue || '';
  modal.showInput = opts.showInput || false;
  modal.confirmText = opts.confirmText || '確定';
  modal.isDanger = opts.isDanger || false;
  modal.onConfirm = opts.onConfirm;
  modal.show = true;
};

const closeModal = () => {
  modal.show = false;
};

const handleModalConfirm = () => {
  if (modal.onConfirm) {
    modal.onConfirm(modal.showInput ? modal.inputValue : true);
  }
  closeModal();
};

const modes = [
  { key: 'mpi', label: 'MPI Runner' },
  { key: 'compile', label: 'Compiler (gcc/nvcc)' },
  { key: 'sysinfo', label: 'System Info Viewer' },
  { key: 'nvprof', label: 'NVIDIA Profiler (nvprof)' },
  { key: 'nsys', label: 'Nsight Systems (nsys)' },
  { key: 'ncu', label: 'Nsight Compute (ncu)' },
  { key: 'rocprof', label: 'ROCm Profiler (rocprof)' },
  { key: 'hipcc', label: 'HIP Compiler (hipcc)' },
  { key: 'slurm', label: 'Slurm 腳本產生器' },
  { key: 'slurm-array', label: 'Slurm 陣列' },
  { key: 'pbs-to-slurm', label: 'PBS to Slurm 轉換器' },
  { key: 'perf', label: 'CPU Profiling (perf)' },
  { key: 'valgrind', label: 'Valgrind' },
  { key: 'cuda-memcheck', label: 'CUDA-MEMCHECK' },
  { key: 'transfer', label: 'Rsync / SCP' },
  { key: 'apptainer', label: 'Apptainer / Singularity' },
  { key: 'apptainer-builder', label: 'Apptainer Builder' },
  { key: 'hpl', label: 'HPL Config Builder' },
  { key: 'stream', label: 'STREAM Benchmark' },
  { key: 'osu', label: 'OSU Benchmark' },
  { key: 'fio', label: 'FIO Disk I/O Benchmark' },
  { key: 'modules', label: 'Environment Modules' },
];

const filteredModes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return modes;
  return modes.filter(m => m.label.toLowerCase().includes(q) || m.key.toLowerCase().includes(q));
});

const currentModeLabel = computed(() => {
  const found = modes.find(m => m.key === mode.value);
  return found ? found.label : 'HPC 指令產生器';
});

const slurmSelectedModules = computed({
  get: () => (slurm.modules || '').trim().split(/\s+/).filter(Boolean),
  set: (val) => {
    slurm.modules = val.join(' ');
  }
});

// Parse Slurm time strings (e.g., "1-00:00:00", "02:00:00", "UNLIMITED") to seconds
const parseSlurmTimeToSeconds = (s) => {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;
  if (/^unlimited$/i.test(str) || /^infinite$/i.test(str)) return Infinity;
  let days = 0;
  let rest = str;
  if (rest.includes('-')) {
    const parts = rest.split('-');
    days = parseInt(parts[0], 10) || 0;
    rest = parts.slice(1).join('-');
  }
  const parts = rest.split(':').map(p => parseInt(p, 10));
  // Support H:M:S or M:S or S
  let secs = 0;
  if (parts.length === 3) {
    secs = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  } else if (parts.length === 2) {
    secs = (parts[0] || 0) * 60 + (parts[1] || 0);
  } else if (parts.length === 1) {
    secs = parts[0] || 0;
  }
  return days * 86400 + secs;
};

const slurmTimeValid = computed(() => {
  try {
    if (!slurm.time) return true;
    if (!slurmData.fetched) return true;
    const part = slurm.partition;
    if (!part) return true;
    const limitStr = slurmData.partitionLimits?.[part];
    if (!limitStr) return true;
    const limitSecs = parseSlurmTimeToSeconds(limitStr);
    if (limitSecs === null) return true;
    if (limitSecs === Infinity) return true;
    const mySecs = parseSlurmTimeToSeconds(slurm.time);
    if (mySecs === null) return true;
    return mySecs <= limitSecs;
  } catch (e) {
    return true;
  }
});

// Helpers
const generatedCommand = computed(() => {
  switch (mode.value) {
    case 'mpi':
      return buildMpiCmd(mpi, mpi.rankfileText);
    case 'compile':
      return buildCompileCmd(compile);
    case 'sysinfo':
      return buildSysInfoCmd(sysinfo);
    case 'nvprof':
      return buildNvprofCmd(nvprof);
    case 'nsys':
      return buildNsysCmd(nsys);
    case 'ncu':
      return buildNcuCmd(ncu);
    case 'rocprof':
      return buildRocprofCmd(rocprof);
    case 'hipcc':
      return buildHipccCmd(hipcc);
    case 'slurm':
      return `sbatch ${slurm.scriptName}`;
    case 'slurm-adv':
      return (
        '# 使用下列旗標加入 sbatch 腳本: ' +
        [
          '--mem',
          slurmAdv.mem,
          '--qos',
          slurmAdv.qos,
          '--gpu-bind',
          slurmAdv.gpuBind,
          '--constraint',
          slurmAdv.constraint,
          slurmAdv.exclusive ? '--exclusive' : '',
          slurmAdv.profile ? '--profile' : '',
        ]
          .filter(Boolean)
          .join(' ')
      );
    case 'slurm-array':
      return `sbatch ${slurmArray.scriptName}`;
    case 'perf':
      return buildPerfCmd(perf);
    case 'valgrind':
      return buildValgrindCmd(valgrind);
    case 'cuda-memcheck':
      return buildCudaMemcheckCmd(cudaMem);
    case 'transfer':
      return buildTransferCmd(transfer);
    case 'apptainer':
      return buildApptainerCmd(apptainer);
    case 'modules':
      return buildModulesCmd(modules);
    default:
      return '';
  }
});

const sendApptainerToMpi = () => {
  mpi.executable = buildApptainerCmd(apptainer);
  mode.value = 'mpi';
};

const sendApptainerToSlurm = () => {
  slurm.run = buildApptainerCmd(apptainer);
  mode.value = 'slurm';
};

const sendCompileToSlurm = () => {
  slurm.run = buildCompileCmd(compile);
  mode.value = 'slurm';
};

const sendNvprofToMpi = () => {
  mpi.executable = buildNvprofCmd(nvprof);
  mode.value = 'mpi';
};

const sendNvprofToSlurm = () => {
  slurm.run = buildNvprofCmd(nvprof);
  mode.value = 'slurm';
};

const sendNsysToMpi = () => {
  mpi.executable = buildNsysCmd(nsys);
  mode.value = 'mpi';
};

const sendNsysToSlurm = () => {
  slurm.run = buildNsysCmd(nsys);
  mode.value = 'slurm';
};

const sendNcuToMpi = () => {
  mpi.executable = buildNcuCmd(ncu);
  mode.value = 'mpi';
};

const sendNcuToSlurm = () => {
  slurm.run = buildNcuCmd(ncu);
  mode.value = 'slurm';
};

const sendPerfToMpi = () => {
  mpi.executable = buildPerfCmd(perf);
  mode.value = 'mpi';
};

const sendPerfToSlurm = () => {
  slurm.run = buildPerfCmd(perf);
  mode.value = 'slurm';
};

const sendValgrindToMpi = () => {
  mpi.executable = buildValgrindCmd(valgrind);
  mode.value = 'mpi';
};

const sendValgrindToSlurm = () => {
  slurm.run = buildValgrindCmd(valgrind);
  mode.value = 'slurm';
};

const sendCudaMemcheckToMpi = () => {
  mpi.executable = buildCudaMemcheckCmd(cudaMem);
  mode.value = 'mpi';
};

const sendCudaMemcheckToSlurm = () => {
  slurm.run = buildCudaMemcheckCmd(cudaMem);
  mode.value = 'slurm';
};

const sendMpiToSlurm = () => {
  slurm.run = buildMpiCmd(mpi, mpi.rankfileText);
  mode.value = 'slurm';
};

const generateWriteSlurmCmd = computed(() => {
  const script = buildSlurmScript(slurm, slurmAdv);
  return `cat << 'EOF' > ${slurm.scriptName}\n${script}\nEOF`;
});

const handleCopy = (text, event) => {
  if (!text) return;
  let content = text;
  if (typeof text === 'function') {
    try { content = text(); } catch (e) { content = String(text); }
  } else if (text && typeof text === 'object' && text.value !== undefined) {
    content = text.value;
  }
  navigator.clipboard.writeText(String(content)).then(() => {
    if (event && event.target) {
      const btn = event.target;
      const originalText = btn.innerText;
      btn.innerText = '已複製！';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
      }, 2000);
    }
    showToast('已複製到剪貼簿！', 'info');
  }).catch((err) => {
    console.error('Copy failed', err);
    showToast('複製失敗', 'error');
  });
};

const copyToClipboard = (event) => {
  let text = generatedCommand.value;
  if (mode.value === 'slurm') text = buildSlurmScript(slurm, slurmAdv);
  if (mode.value === 'slurm-array') text = buildArrayScript(slurmArray);
  if (mode.value === 'slurm' && !slurmTimeValid.value) {
    showToast('時間超過所選 partition 的限制，請調整後再複製。', 'error');
    return;
  }
  handleCopy(text, event);
};

const downloadSlurm = () => {
  if (!slurmTimeValid.value) {
    showToast('時間超過所選 partition 的限制，請調整後再下載。', 'error');
    return;
  }
  const blob = new Blob([buildSlurmScript(slurm, slurmAdv)], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = slurm.scriptName || 'run.slurm';
  a.click();
  URL.revokeObjectURL(a.href);
};

// Wrappers to allow click even when logically 'disabled' so we can show a toast
const copySlurmPreview = (event) => {
  if (!slurmTimeValid.value) {
    showToast('時間超過所選 partition 的限制，請調整後再複製。', 'error');
    return;
  }
  handleCopy(() => buildSlurmScript(slurm, slurmAdv), event);
};

const onCopyGenerate = (event) => {
  if (!slurmTimeValid.value) {
    showToast('時間超過所選 partition 的限制，請調整後再複製。', 'error');
    return;
  }
  handleCopy(generateWriteSlurmCmd, event);
};

const onCopySbatch = (event) => {
  if (!slurmTimeValid.value) {
    showToast('時間超過所選 partition 的限制，請調整後再複製。', 'error');
    return;
  }
  handleCopy(`sbatch ${slurm.scriptName}`, event);
};

const tryDownloadSlurm = () => {
  if (!slurmTimeValid.value) {
    showToast('時間超過所選 partition 的限制，請調整後再下載。', 'error');
    return;
  }
  downloadSlurm();
};

// --- Server Management Logic ---
const servers = ref([{ id: 'default', name: '預設伺服器' }]);
const currentServerId = ref('default');
let isLoading = false;

const serverState = {
  mpi, compile, nvprof, nsys, ncu, rocprof, hipcc, slurm, slurmAdv, slurmArray, transfer, modules, perf, valgrind, cudaMem, sysinfo, apptainer, hpl, hplMem, osu
};

const saveCurrentServerData = () => {
  if (isLoading) return;
  const data = {};
  for (const key in serverState) {
    data[key] = JSON.parse(JSON.stringify(serverState[key]));
  }
  localStorage.setItem(`hpc_tools_data_${currentServerId.value}`, JSON.stringify(data));
  localStorage.setItem('hpc_tools_servers', JSON.stringify(servers.value));
  localStorage.setItem('hpc_tools_current_id', currentServerId.value);
};

const applyState = (data) => {
  if (!data) return;
  isLoading = true;
  for (const key in serverState) {
    if (data[key]) {
      Object.assign(serverState[key], data[key]);
    }
  }
  setTimeout(() => { isLoading = false; }, 50);
};

const switchServer = (newId) => {
  saveCurrentServerData();
  currentServerId.value = newId;
  const saved = localStorage.getItem(`hpc_tools_data_${newId}`);
  if (saved) {
    applyState(JSON.parse(saved));
  }
  localStorage.setItem('hpc_tools_current_id', newId);
};

const addServer = () => {
  openModal({
    title: '新增伺服器',
    message: '請輸入新伺服器的名稱：',
    showInput: true,
    defaultValue: '新伺服器',
    onConfirm: (name) => {
      if (name && name.trim()) {
        const id = 'server_' + Date.now();
        servers.value.push({ id, name: name.trim() });
        saveCurrentServerData();
        switchServer(id);
        showToast('已新增伺服器');
      }
    }
  });
};

const renameServer = () => {
  const server = servers.value.find(s => s.id === currentServerId.value);
  if (!server || server.id === 'default') return;
  
  openModal({
    title: '重新命名伺服器',
    message: '請輸入新的名稱：',
    showInput: true,
    defaultValue: server.name,
    onConfirm: (newName) => {
      if (newName && newName.trim()) {
        server.name = newName.trim();
        saveCurrentServerData();
        showToast('已重新命名');
      }
    }
  });
};

const deleteServer = () => {
  if (currentServerId.value === 'default') return;
  
  openModal({
    title: '刪除伺服器',
    message: `確定要刪除「${servers.value.find(s => s.id === currentServerId.value)?.name}」及其所有設定嗎？此動作無法復原。`,
    isDanger: true,
    confirmText: '刪除',
    onConfirm: () => {
      const idx = servers.value.findIndex(s => s.id === currentServerId.value);
      localStorage.removeItem(`hpc_tools_data_${currentServerId.value}`);
      servers.value.splice(idx, 1);
      switchServer('default');
      showToast('已刪除伺服器');
    }
  });
};

const exportConfig = () => {
  const currentServer = servers.value.find(s => s.id === currentServerId.value);
  const data = {
    mode: mode.value,
    serverName: currentServer ? currentServer.name : '預設伺服器',
    state: {}
  };
  for (const key in serverState) {
    data.state[key] = JSON.parse(JSON.stringify(serverState[key]));
  }
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = currentServer ? `hpc-config-${currentServer.name}.json` : 'hpc-tools-config.json';
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  showToast('設定檔已匯出！');
};

const fileInput = ref(null);

const triggerImport = () => {
  fileInput.value.click();
};

const createNewServerFromImport = (data) => {
  const id = 'server_' + Date.now();
  const name = data.serverName || '匯入的伺服器';
  servers.value.push({ id, name });
  // We need to save the data for this new ID before switching
  const stateToSave = JSON.stringify(data.state || {});
  localStorage.setItem(`hpc_tools_data_${id}`, stateToSave);
  localStorage.setItem('hpc_tools_servers', JSON.stringify(servers.value));
  
  switchServer(id);
  if (data.mode) mode.value = data.mode;
  showToast(`已建立新伺服器「${name}」並匯入設定`);
};

const handleFileImport = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = e.target.result;
      const data = JSON.parse(json);
      
      if (data.serverName) {
        const existingServer = servers.value.find(s => s.name === data.serverName);
        if (existingServer) {
          openModal({
            title: '匯入設定',
            message: `伺服器「${data.serverName}」已存在，是否要覆蓋現有設定？`,
            confirmText: '覆蓋現有',
            onConfirm: () => {
              switchServer(existingServer.id);
              if (data.state) applyState(data.state);
              if (data.mode) mode.value = data.mode;
              showToast(`已覆蓋「${data.serverName}」的設定`);
            }
          });
        } else {
          createNewServerFromImport(data);
        }
      } else {
        // Legacy format
        if (data.mode) mode.value = data.mode;
        if (data.state) applyState(data.state);
        showToast('設定檔已匯入！');
      }
    } catch (err) {
      console.error(err);
      showToast('匯入失敗：檔案格式錯誤', 'error');
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };
  reader.readAsText(file);
};

// Initialize
const savedServers = localStorage.getItem('hpc_tools_servers');
if (savedServers) {
  servers.value = JSON.parse(savedServers);
}
const savedId = localStorage.getItem('hpc_tools_current_id');
if (savedId && servers.value.find(s => s.id === savedId)) {
  currentServerId.value = savedId;
  const savedData = localStorage.getItem(`hpc_tools_data_${savedId}`);
  if (savedData) applyState(JSON.parse(savedData));
}

// Handle Shared URL
const hash = window.location.hash;
if (hash.startsWith('#share=')) {
  try {
    const encoded = hash.substring(7);
    const tryDecompress = (s) => {
      try {
        const dec = decompressFromEncodedURIComponent(s);
        if (dec) return dec;
      } catch (e) { }
      // Fallbacks: try base64url -> base64 decode, then atob
      try {
        let b = s.replace(/-/g, '+').replace(/_/g, '/');
        while (b.length % 4) b += '=';
        return decodeURIComponent(escape(atob(b)));
      } catch (e) {
        try {
          return decodeURIComponent(escape(atob(s)));
        } catch (e2) {
          throw e2;
        }
      }
    };

    const json = tryDecompress(encoded);
    const data = JSON.parse(json);
    if (data.mode) mode.value = data.mode;
    if (data.state) applyState(data.state);
    // Optional: clear hash after loading to keep URL clean
    window.history.replaceState(null, null, window.location.pathname);
  } catch (e) {
    console.error('Failed to load shared state', e);
  }
}

watch(mode, () => {
  mobileMenuOpen.value = false;
});

watch([mpi, compile, nvprof, nsys, ncu, rocprof, hipcc, slurm, slurmAdv, slurmArray, transfer, modules, perf, valgrind, cudaMem, sysinfo, apptainer, hpl, hplMem, osu], () => {
  saveCurrentServerData();
}, { deep: true });
</script>

<template>
  <div class="app-shell">
    <header class="mobile-header">
      <button class="menu-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
        <span class="hamburger"></span>
      </button>
      <span class="mobile-brand">🚀 HPC Tools</span>
      <div class="mobile-mode-label">{{ currentModeLabel }}</div>
    </header>

    <transition name="toast">
      <div v-if="toast.show" :class="['toast', toast.type]">
        {{ toast.message }}
      </div>
    </transition>

    <!-- Modal Overlay -->
    <transition name="fade">
      <div v-if="modal.show" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <h3>{{ modal.title }}</h3>
          <p v-if="modal.message">{{ modal.message }}</p>
          <input 
            v-if="modal.showInput" 
            v-model="modal.inputValue" 
            type="text" 
            class="modal-input"
            @keyup.enter="handleModalConfirm"
            ref="modalInput"
            autofocus
          />
          <div class="modal-actions">
            <button class="modal-btn cancel" @click="closeModal">{{ modal.cancelText }}</button>
            <button 
              :class="['modal-btn confirm', { danger: modal.isDanger }]" 
              @click="handleModalConfirm"
            >
              {{ modal.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <aside :class="['sidebar', { collapsed: sidebarCollapsed, 'mobile-open': mobileMenuOpen }]">
      <div class="sidebar-header">
        <span class="brand">🚀 HPC Tools</span>
        <button class="toggle-btn desktop-only" @click="sidebarCollapsed = !sidebarCollapsed">{{ sidebarCollapsed ? '➤' : '◀' }}</button>
      </div>
      <div class="sidebar-search" v-if="!sidebarCollapsed || mobileMenuOpen">
        <input type="text" v-model="searchQuery" placeholder="搜尋功能..." />
      </div>
      <nav class="sidebar-nav" :aria-label="'功能清單'">
        <ul>
          <li v-for="m in filteredModes" :key="m.key" :class="{ active: mode === m.key }" @click="mode = m.key">
            <span class="item-label" v-if="!sidebarCollapsed || mobileMenuOpen">{{ m.label }}</span>
            <span class="item-dot" v-else :title="m.label"></span>
          </li>
        </ul>
      </nav>

      <div class="sidebar-footer" v-if="!sidebarCollapsed || mobileMenuOpen">
        <div class="server-switcher">
          <label>伺服器實例</label>
          <div class="server-select-row">
            <select :value="currentServerId" @change="switchServer($event.target.value)">
              <option v-for="s in servers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <button class="icon-btn" @click="addServer" title="新增伺服器">+</button>
          </div>
          <div class="config-actions">
            <button class="share-btn" @click="exportConfig">📤 匯出設定 (JSON)</button>
            <button class="share-btn" @click="triggerImport">📥 匯入設定 (JSON)</button>
            <input 
              type="file" 
              ref="fileInput" 
              style="display: none" 
              accept=".json" 
              @change="handleFileImport" 
            />
          </div>
          <div class="server-actions" v-if="currentServerId !== 'default'">
            <button @click="renameServer">重新命名</button>
            <button @click="deleteServer" class="danger">刪除</button>
          </div>
        </div>
        <div class="github-link-container">
          <a href="https://github.com/rainchi/hpc-tools" target="_blank" rel="noopener noreferrer" class="github-link">
            <span class="icon">GitHub</span>
            <span class="text">rainchi/hpc-tools</span>
          </a>
        </div>
      </div>
    </aside>

    <div class="sidebar-overlay" v-if="mobileMenuOpen" @click="mobileMenuOpen = false"></div>

    <main class="content">
      <header class="page-title"><h1>{{ currentModeLabel }}</h1></header>

      <!-- Remove top tabs, selection moved to sidebar -->

      <!-- MPI Runner -->
      <div v-if="mode === 'mpi'">
        <div class="quick-start-banner">
          <div class="banner-content">
            <span class="icon">💡</span>
            <span>還沒有測試程式？快速建立一個 MPI Hello World</span>
          </div>
          <button class="copy-btn small" @click="copyHelloCode">複製建立指令</button>
        </div>

        <div class="form-group">
          <label>MPI 實作版本 (Implementation)</label>
          <CustomSelect 
            v-model="mpi.type" 
            :options="[
              { value: 'openmpi', label: 'OpenMPI (ompi)' },
              { value: 'intel', label: 'Intel MPI (impi)' },
              { value: 'mpich', label: 'MPICH' }
            ]" 
          />
        </div>

        <div class="inline">
          <div class="form-group">
            <label>總核心數 (Total Ranks / -np)</label>
            <input type="number" v-model.number="mpi.np" min="1" placeholder="例如: 4" />
          </div>
          <div class="form-group">
            <label>每節點核心數 (per-node)</label>
            <input type="number" v-model.number="mpi.ppn" min="1" placeholder="例如: 2" />
          </div>
        </div>

        <div class="form-group">
          <label>Hostfile 路徑 (選填)</label>
          <input type="text" v-model="mpi.hostfile" placeholder="例如: ./hostfile" />
        </div>

        <div class="checkbox-group">
          <div>
            <input type="checkbox" id="show-map" v-model="mpi.showMap" />
            <label for="show-map">顯示綁定資訊 (Display map/binding)</label>
          </div>
          <div>
            <input type="checkbox" id="bynode" v-model="mpi.byNode" />
            <label for="bynode">按節點分配 (by-node)</label>
          </div>
          <div>
            <input type="checkbox" id="bind-to-core" v-model="mpi.bindToCore" />
            <label for="bind-to-core">綁定到核心 (bind-to core)</label>
          </div>
        </div>

        <div class="inline">
          <div class="form-group">
            <label>OMP_NUM_THREADS</label>
            <input type="number" v-model.number="mpi.omp" min="1" placeholder="例如: 1" />
          </div>
          <div class="form-group">
            <label>其他環境變數 (KEY=VALUE; 以空格分隔)</label>
            <input type="text" v-model="mpi.envExtra" placeholder="CUDA_VISIBLE_DEVICES=0 NCCL_DEBUG=INFO" />
          </div>
        </div>

        <div class="form-group">
          <label>執行檔與參數</label>
          <input type="text" v-model="mpi.executable" placeholder="./a.out arg1" />
        </div>
        <small class="muted">提示：OpenMPI 用 --bind-to；Intel MPI 可用 -genv；MPICH 用 -env</small>

        <hr />
        <CpuBinding 
          v-model="mpi.rankfileText" 
          v-model:config="mpi.bindingConfig"
          :mpiType="mpi.type" 
          :hostfile="mpi.hostfile" 
          :externalTopology="cpuTopologyRaw" 
          :defaultRanks="mpi.np" 
        />
        <div v-if="mpi.rankfileText" class="result-box">
          <div class="btn-row">
            <button class="copy-btn" @click="navigator.clipboard.writeText(mpi.rankfileText); alert('rankfile 已複製！');">複製 rankfile</button>
            <button class="copy-btn" @click="(() => { const blob = new Blob([mpi.rankfileText], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rankfile.txt'; a.click(); URL.revokeObjectURL(a.href); })()">下載 rankfile</button>
          </div>
          # 產生的 OpenMPI rankfile 預覽
          {{ mpi.rankfileText }}
        </div>
        <small class="muted">OpenMPI 可用 --rankfile；Intel MPI 可對應 I_MPI_PIN_PROCESSOR_LIST；MPICH 可用 taskset/sched_setaffinity。</small>
      </div>

      <!-- Compiler Generator -->
      <div v-if="mode === 'compile'">
        <div class="form-group">
          <label>編譯器 (Compiler)</label>
          <CustomSelect 
            v-model="compile.compiler" 
            :options="[
              { value: 'gcc', label: 'GCC (gcc/g++)' },
              { value: 'icc', label: 'Intel C++ (icc/icpc)' },
              { value: 'nvcc', label: 'NVIDIA CUDA (nvcc)' }
            ]" 
          />
        </div>

        <div class="inline">
          <div class="form-group">
            <label>輸出檔名 (-o)</label>
            <input type="text" v-model="compile.output" placeholder="例如: app.out" />
          </div>
          <div class="form-group">
            <label>優化等級 (Optimization)</label>
            <select v-model="compile.optimization">
              <option value="-O0">-O0 (無優化)</option>
              <option value="-O1">-O1</option>
              <option value="-O2">-O2</option>
              <option value="-O3">-O3 (強烈建議)</option>
              <option value="-Ofast">-Ofast (不安全優化)</option>
            </select>
          </div>
        </div>

        <div class="inline">
          <div class="form-group">
            <label>架構優化 (-march)</label>
            <input type="text" v-model="compile.march" placeholder="例如: native, znver3, cascadelake" />
          </div>
          <div class="form-group">
            <label>其他旗標 (Custom Flags)</label>
            <input type="text" v-model="compile.customFlags" placeholder="例如: -g -Wall" />
          </div>
        </div>

        <div class="form-group">
          <label>平行運算與函式庫</label>
          <div class="checkbox-group">
            <label>
              <input type="checkbox" v-model="compile.openmp" />
              啟用 OpenMP
            </label>
            <label>
              <input type="checkbox" :checked="compile.libraries.includes('mkl')" @change="e => e.target.checked ? compile.libraries.push('mkl') : compile.libraries = compile.libraries.filter(l => l !== 'mkl')" />
              Intel MKL
            </label>
            <label>
              <input type="checkbox" :checked="compile.libraries.includes('openblas')" @change="e => e.target.checked ? compile.libraries.push('openblas') : compile.libraries = compile.libraries.filter(l => l !== 'openblas')" />
              OpenBLAS
            </label>
            <label>
              <input type="checkbox" :checked="compile.libraries.includes('fftw3')" @change="e => e.target.checked ? compile.libraries.push('fftw3') : compile.libraries = compile.libraries.filter(l => l !== 'fftw3')" />
              FFTW3
            </label>
            <label v-if="compile.compiler !== 'nvcc'">
              <input type="checkbox" :checked="compile.libraries.includes('cuda')" @change="e => e.target.checked ? compile.libraries.push('cuda') : compile.libraries = compile.libraries.filter(l => l !== 'cuda')" />
              CUDA Runtime
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>原始碼檔案 (Source files)</label>
          <input type="text" v-model="compile.src" placeholder="例如: main.c utils.c" />
        </div>
        <small class="muted">提示：使用 MKL 時，若非 Intel 編譯器，會自動加入連結參數。-march=native 會針對當前機器架構進行優化。</small>
      </div>

      <!-- System Info Viewer -->
      <div v-if="mode === 'sysinfo'">
        <div class="form-group">
          <label>指令選項</label>
          <div class="checkbox-group">
            <div>
              <input type="checkbox" id="sysinfo-base64" v-model="sysinfo.useBase64" />
              <label for="sysinfo-base64">使用 Base64 編碼 (避免複製貼上時的編碼問題)</label>
            </div>
          </div>

          <label style="margin-top: 12px;">收集項目</label>
          <div class="checkbox-group">
             <label><input type="checkbox" v-model="sysinfo.collectOs"> OS / Kernel / Limits</label>
             <label><input type="checkbox" v-model="sysinfo.collectCpu"> CPU Summary & Topology</label>
             <label><input type="checkbox" v-model="sysinfo.collectMem"> Memory & NUMA</label>
             <label><input type="checkbox" v-model="sysinfo.collectLstopo"> Hardware Topology (lstopo)</label>
             <label><input type="checkbox" v-model="sysinfo.collectEnv"> Environment Variables & Modules</label>
             <label><input type="checkbox" v-model="sysinfo.collectNvidia"> NVIDIA GPU (nvidia-smi)</label>
             <label><input type="checkbox" v-model="sysinfo.collectAmd"> AMD GPU (rocm-smi)</label>
             <label><input type="checkbox" v-model="sysinfo.collectSlurm"> Slurm Info (Partitions/QoS)</label>
          </div>
        </div>
        <div class="form-group">
          <label>貼上輸出結果</label>
          <textarea v-model="sysinfo.rawOutput" rows="8" placeholder="請將下方指令的執行結果貼到這裡..." @paste="onSysInfoPaste"></textarea>
        </div>
        <SystemInfoViewer :rawOutput="sysinfo.rawOutput" />
      </div>

      <!-- nvprof (legacy) -->
      <div v-if="mode === 'nvprof'">
        <small class="muted">nvprof 已被 Nsight 系列工具取代，建議改用 nsys / ncu。</small>
        <div class="form-group">
          <label>輸出檔案 (Output File)</label>
          <input type="text" v-model="nvprof.output" placeholder="analysis.nvvp" />
        </div>

        <div class="checkbox-group">
          <div>
            <input type="checkbox" id="print-summary" v-model="nvprof.printSummary" />
            <label for="print-summary">Print Summary</label>
          </div>
          <div>
            <input type="checkbox" id="print-gpu-trace" v-model="nvprof.printGpuTrace" />
            <label for="print-gpu-trace">Print GPU Trace</label>
          </div>
        </div>

        <div class="form-group">
          <label>目標執行檔</label>
          <input type="text" v-model="nvprof.executable" placeholder="./cuda_app" />
        </div>
      </div>

      <!-- Nsight Systems -->
      <div v-if="mode === 'nsys'">
        <div class="inline">
          <div class="form-group">
            <label>輸出檔案 (.nsys-rep)</label>
            <input type="text" v-model="nsys.output" placeholder="profile" />
          </div>
        </div>

        <div class="form-group">
          <label>追蹤範圍 (Trace Domains)</label>
          <div class="checkbox-group">
            <label><input type="checkbox" :value="'cuda'" v-model="nsys.selectedTraces" /> CUDA：GPU 核心/記憶體活動</label>
            <label><input type="checkbox" :value="'mpi'" v-model="nsys.selectedTraces" /> MPI：分散式通訊 (rank、collective)</label>
            <label><input type="checkbox" :value="'nvtx'" v-model="nsys.selectedTraces" /> NVTX：自訂區段/範圍標記</label>
            <label><input type="checkbox" :value="'osrt'" v-model="nsys.selectedTraces" /> OS Runtime：作業系統層 (執行緒/排程)</label>
            <label><input type="checkbox" :value="'openmp'" v-model="nsys.selectedTraces" /> OpenMP：多執行緒平行區域</label>
            <label><input type="checkbox" :value="'posix'" v-model="nsys.selectedTraces" /> POSIX：檔案 I/O 與系統呼叫</label>
            <label><input type="checkbox" :value="'net'" v-model="nsys.selectedTraces" /> Network：網路 I/O</label>
            <label><input type="checkbox" :value="'memory'" v-model="nsys.selectedTraces" /> Memory：記憶體配置/釋放</label>
            <label><input type="checkbox" :value="'ipc'" v-model="nsys.selectedTraces" /> IPC：跨程序通訊</label>
          </div>
          <small class="muted">勾選想要觀察的領域；會自動組合成 --trace 參數。</small>
        </div>

        <div class="checkbox-group">
          <div>
            <input type="checkbox" id="nsys-summary" v-model="nsys.summary" />
            <label for="nsys-summary">產生摘要 (--summary=true)</label>
          </div>
          <div>
            <input type="checkbox" id="nsys-sample" v-model="nsys.sample" />
            <label for="nsys-sample">CPU 抽樣 (--sample=cpu)</label>
          </div>
        </div>

        <div class="form-group">
          <label>目標執行檔</label>
          <input type="text" v-model="nsys.executable" placeholder="./cuda_app" />
        </div>
      </div>

      <!-- Nsight Compute -->
      <div v-if="mode === 'ncu'">
        <div class="inline">
          <div class="form-group">
            <label>輸出檔案 (report)</label>
            <input type="text" v-model="ncu.output" placeholder="report.ncu-rep" />
          </div>
          <div class="form-group">
            <label>指標集合 (set)</label>
            <input type="text" v-model="ncu.set" placeholder="full" />
          </div>
        </div>
        <div class="form-group">
          <label>選擇kernel (regex)</label>
          <input type="text" v-model="ncu.kernelRegex" placeholder=".*" />
        </div>
        <div class="form-group">
          <label>目標執行檔</label>
          <input type="text" v-model="ncu.executable" placeholder="./cuda_app" />
        </div>
      </div>

      <!-- ROCm Profiler -->
      <div v-if="mode === 'rocprof'">
        <div class="info-banner">
          <span class="icon">🚀</span>
          <span>AMD ROCm Profiler (rocprof) 用於收集 GPU 效能指標與追蹤。</span>
        </div>
        <div class="inline">
          <div class="form-group">
            <label>輸出檔案 (.csv)</label>
            <input type="text" v-model="rocprof.output" placeholder="results.csv" />
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px; padding-top: 25px;">
            <input type="checkbox" id="roc-stats" v-model="rocprof.stats" />
            <label for="roc-stats" style="margin-bottom: 0;">收集統計數據 (--stats)</label>
          </div>
        </div>
        <div class="checkbox-group">
          <div>
            <input type="checkbox" id="roc-hip" v-model="rocprof.hipTrace" />
            <label for="roc-hip">HIP 追蹤 (--hip-trace)</label>
          </div>
          <div>
            <input type="checkbox" id="roc-roctx" v-model="rocprof.roctxTrace" />
            <label for="roc-roctx">ROCTX 標記追蹤 (--roctx-trace)</label>
          </div>
          <div>
            <input type="checkbox" id="roc-ts" v-model="rocprof.timestamp" />
            <label for="roc-ts">啟用時間戳記 (--timestamp on)</label>
          </div>
        </div>
        <div class="form-group">
          <label>目標執行檔</label>
          <input type="text" v-model="rocprof.executable" placeholder="./hip_app" />
        </div>

        <div class="amd-env-box" style="margin-top: 20px; background: rgba(255, 0, 0, 0.05); border: 1px solid rgba(255, 0, 0, 0.2); border-radius: 8px; padding: 15px;">
          <h4 style="margin-top: 0; color: #ff6b6b;">AMD GPU 常用環境變數</h4>
          <ul style="font-size: 0.85rem; color: #c9d1d9; padding-left: 20px;">
            <li><code>HSA_OVERRIDE_GFX_VERSION=10.3.0</code>: 強制指定 GPU 架構版本</li>
            <li><code>ROCR_VISIBLE_DEVICES=0,1</code>: 指定可見的 ROCm 裝置</li>
            <li><code>HIP_VISIBLE_DEVICES=0</code>: 指定可見的 HIP 裝置</li>
            <li><code>AMD_LOG_LEVEL=3</code>: 設定 AMD 驅動程式日誌等級</li>
            <li><code>MIOPEN_DEBUG_DISABLE_CONV_ALGO_TYPES=0</code>: MIOpen 調試</li>
          </ul>
        </div>
      </div>

      <!-- HIP Compiler -->
      <div v-if="mode === 'hipcc'">
        <div class="info-banner">
          <span class="icon">🛠️</span>
          <span>hipcc 是 AMD 的編譯器驅動程式，可將 HIP 程式碼編譯為 AMD 或 NVIDIA 執行檔。</span>
        </div>
        <div class="inline">
          <div class="form-group">
            <label>輸出檔名 (-o)</label>
            <input type="text" v-model="hipcc.output" placeholder="app.out" />
          </div>
          <div class="form-group">
            <label>優化等級</label>
            <CustomSelect 
              v-model="hipcc.optimization" 
              :options="[
                { value: '-O0', label: '-O0 (無優化)' },
                { value: '-O2', label: '-O2 (標準)' },
                { value: '-O3', label: '-O3 (最高)' },
                { value: '-Ofast', label: '-Ofast (極速)' }
              ]" 
            />
          </div>
        </div>
        <div class="inline">
          <div class="form-group">
            <label>目標架構 (--offload-arch)</label>
            <input type="text" v-model="hipcc.offloadArch" placeholder="例如: gfx90a, gfx1030" />
            <small class="muted">MI200: gfx90a | MI100: gfx908 | RX6000: gfx1030</small>
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px; padding-top: 25px;">
            <input type="checkbox" id="hip-omp" v-model="hipcc.openmp" />
            <label for="hip-omp" style="margin-bottom: 0;">啟用 OpenMP (-fopenmp)</label>
          </div>
        </div>
        <div class="form-group">
          <label>原始碼檔案</label>
          <input type="text" v-model="hipcc.src" placeholder="main.cpp" />
        </div>
        <div class="form-group">
          <label>自定義旗標</label>
          <input type="text" v-model="hipcc.customFlags" placeholder="-I/opt/rocm/include" />
        </div>

        <div class="amd-env-box" style="margin-top: 20px; background: rgba(255, 0, 0, 0.05); border: 1px solid rgba(255, 0, 0, 0.2); border-radius: 8px; padding: 15px;">
          <h4 style="margin-top: 0; color: #ff6b6b;">AMD GPU 常用環境變數</h4>
          <ul style="font-size: 0.85rem; color: #c9d1d9; padding-left: 20px;">
            <li><code>HSA_OVERRIDE_GFX_VERSION=10.3.0</code>: 強制指定 GPU 架構版本</li>
            <li><code>ROCR_VISIBLE_DEVICES=0,1</code>: 指定可見的 ROCm 裝置</li>
            <li><code>HIP_VISIBLE_DEVICES=0</code>: 指定可見的 HIP 裝置</li>
            <li><code>AMD_LOG_LEVEL=3</code>: 設定 AMD 驅動程式日誌等級</li>
          </ul>
        </div>
      </div>

      <!-- Slurm sbatch generator -->
      <div v-if="mode === 'slurm'">
        <div class="info-banner" v-if="!slurmData.fetched">
          💡 提示：您可以在「System Info Viewer」功能中收集 Slurm 資訊，即可在此處使用下拉選單選擇 Partition 與 Account。
        </div>
        <div class="inline">
          <div class="form-group">
            <label>作業名稱 (Job Name)</label>
            <input type="text" v-model="slurm.jobName" placeholder="myjob" />
          </div>
          <div class="form-group">
            <label>佇列/分區 (Partition)</label>
            <Combobox v-model="slurm.partition" :options="slurmData.partitions" placeholder="gpu" />
          </div>
        </div>
        <div class="inline">
          <div class="form-group">
            <label>帳號 (Account)</label>
            <Combobox v-model="slurm.account" :options="slurmData.accounts" placeholder="project123" />
          </div>
          <div class="form-group">
            <label>時間限制 (Time HH:MM:SS)</label>
            <input type="text" v-model="slurm.time" placeholder="01:00:00" />
            <small v-if="!slurmTimeValid" class="error-text" style="color:#ff6b6b; display:block; margin-top:6px;">選取的 partition 最大時間為 {{ slurmData.partitionLimits[slurm.partition] || '未知' }}，請輸入較小的時間。</small>
          </div>
        </div>
        <div class="inline">
          <div class="form-group">
            <label>節點數 (Nodes)</label>
            <input type="number" v-model.number="slurm.nodes" min="1" placeholder="1" />
          </div>
          <div class="form-group">
            <label>每節點核心數 (ntasks-per-node)</label>
            <input type="number" v-model.number="slurm.ntasksPerNode" min="1" placeholder="4" />
          </div>
        </div>
        <div class="inline">
          <div class="form-group">
            <label>每任務 threads (OMP_NUM_THREADS)</label>
            <input type="number" v-model.number="slurm.omp" min="1" placeholder="1" />
          </div>
          <div class="form-group">
            <label>GPU 數量 (per-node)</label>
            <input type="number" v-model.number="slurm.gpusPerNode" min="0" placeholder="0" />
          </div>
        </div>
        <div class="form-group">
          <label>Modules (以空格分隔)</label>
          <input type="text" v-model="slurm.modules" placeholder="例如: gcc/12.2 openmpi/4.1.5" />
          
          <div v-if="availableModules.length > 0" style="margin-top: 12px;">
            <details>
              <summary style="cursor: pointer; color: #58a6ff; font-size: 0.9rem;">從已掃描列表挑選 ({{ slurmSelectedModules.length }} 已選)</summary>
              <div class="module-list-container" style="max-height: 250px; margin-top: 12px;">
                <div v-for="pkg in availableModules" :key="pkg.name" class="module-group">
                  <div class="pkg-name">{{ pkg.name }}</div>
                  <div class="pkg-versions">
                    <label v-for="ver in pkg.versions" :key="ver" class="version-chip">
                      <input type="checkbox" :value="ver ? `${pkg.name}/${ver}` : pkg.name" v-model="slurmSelectedModules" />
                      <span class="chip-content">{{ ver || 'default' }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </details>
          </div>
          <div v-else style="margin-top: 8px;">
            <small class="muted">💡 提示：在「Environment Modules」分頁掃描模組後，即可在此處快速挑選。</small>
          </div>
        </div>
        <div class="form-group">
          <label>環境變數 (KEY=VALUE 空格分隔)</label>
          <input type="text" v-model="slurm.env" placeholder="NCCL_DEBUG=INFO OMP_PLACES=cores" />
        </div>
        <div class="form-group">
          <label>執行指令</label>
          <input type="text" v-model="slurm.run" placeholder="mpirun -np 4 ./a.out" />
        </div>
        <div class="form-group">
          <label>腳本檔名</label>
          <input type="text" v-model="slurm.scriptName" placeholder="run.slurm" />
        </div>
        <small class="muted">提示：如需 GPU，請設定 --gpus-per-node 或在 Partition 指定 gpu 佇列。</small>

        <div style="margin-top: 20px; border: 1px solid #30363d; border-radius: 8px; padding: 12px; background: rgba(255,255,255,0.02);">
          <details>
            <summary style="cursor: pointer; font-weight: 600; color: #c9d1d9;">進階選項 (Advanced Options)</summary>
            <div style="margin-top: 16px;">
              <div class="inline">
                <div class="form-group">
                  <label>記憶體限制 (--mem)</label>
                  <input type="text" v-model="slurmAdv.mem" placeholder="32G" />
                </div>
                <div class="form-group">
                  <label>QoS (--qos)</label>
                  <Combobox v-model="slurmAdv.qos" :options="slurmData.qos" placeholder="normal" />
                </div>
              </div>
              <div class="inline">
                <div class="form-group">
                  <label>GPU 綁定 (--gpu-bind)</label>
                  <input type="text" v-model="slurmAdv.gpuBind" placeholder="closest" />
                </div>
                <div class="form-group">
                  <label>節點限制 (--constraint)</label>
                  <input type="text" v-model="slurmAdv.constraint" placeholder="a100|nvlink" />
                </div>
              </div>
              <div class="checkbox-group">
                <div>
                  <input type="checkbox" id="exclusive" v-model="slurmAdv.exclusive" />
                  <label for="exclusive">獨占節點 (--exclusive)</label>
                </div>
                <div>
                  <input type="checkbox" id="profile" v-model="slurmAdv.profile" />
                  <label for="profile">啟用 Slurm profile (--profile)</label>
                </div>
              </div>
            </div>
          </details>
        </div>

        <hr />
        <div class="checkbox-group">
          <div>
            <input type="checkbox" id="show-slurm-preview" v-model="showSlurmPreview" />
            <label for="show-slurm-preview">預覽腳本內容 (Preview Script)</label>
          </div>
          <div>
            <input type="checkbox" id="show-srun-preview" v-model="showSrunPreview" />
            <label for="show-srun-preview">顯示測試指令 (Show Test Commands)</label>
          </div>
        </div>
        <div v-if="showSlurmPreview" class="result-box">
          <div class="btn-row">
            <button class="copy-btn" @click="copySlurmPreview($event)">複製內容</button>
          </div>
          <pre>{{ buildSlurmScript(slurm, slurmAdv) }}</pre>
        </div>
        <div v-if="showSrunPreview" class="result-box">
          <div class="section-title" style="margin-top: 0;">互動式測試 (Interactive)</div>
          <div class="btn-row">
            <button class="copy-btn" @click="handleCopy(buildSrunCmd(slurm, slurmAdv).interactive, $event)">複製</button>
          </div>
          <pre>{{ buildSrunCmd(slurm, slurmAdv).interactive }}</pre>
          
          <div class="section-title">直接執行 (Run Command)</div>
          <div class="btn-row">
            <button class="copy-btn" @click="handleCopy(buildSrunCmd(slurm, slurmAdv).runCmd, $event)">複製</button>
          </div>
          <pre>{{ buildSrunCmd(slurm, slurmAdv).runCmd }}</pre>
        </div>
      </div>

      <!-- Slurm array -->
      <div v-if="mode === 'slurm-array'">
        <div class="info-banner">
          <strong>什麼是 Slurm Job Array？</strong><br/>
          Job Array 用於一次提交大量性質相似的作業（例如參數掃描或批次處理數據）。<br/>
          系統會為每個任務分配一個唯一的 ID，存放在環境變數 <code>$SLURM_ARRAY_TASK_ID</code> 中。
        </div>

        <div class="inline">
          <div class="form-group">
            <label>陣列範圍 (--array)</label>
            <input type="text" v-model="slurmArray.range" placeholder="0-99%10" />
          </div>
          <div class="form-group">
            <label>輸出檔命名</label>
            <input type="text" v-model="slurmArray.outFmt" placeholder="%x.%A.%a.out" />
          </div>
        </div>
        <div class="form-group">
          <label>錯誤檔命名</label>
          <input type="text" v-model="slurmArray.errFmt" placeholder="%x.%A.%a.err" />
        </div>
        <div class="form-group">
          <label>陣列執行指令 (可用 SLURM_ARRAY_TASK_ID)</label>
          <input type="text" v-model="slurmArray.run" placeholder="./run.sh ${SLURM_ARRAY_TASK_ID}" />
        </div>
        <div class="form-group">
          <label>腳本檔名</label>
          <input type="text" v-model="slurmArray.scriptName" placeholder="array.slurm" />
        </div>

        <div style="margin-top: 20px; border: 1px solid #30363d; border-radius: 8px; padding: 12px; background: rgba(255,255,255,0.02);">
          <h4 style="margin-top: 0; color: #fff; font-size: 0.95rem;">範例用法 (Example Usage)</h4>
          <ul style="color: #8b949e; font-size: 0.85rem; padding-left: 20px; margin-bottom: 0;">
            <li><strong>處理多個檔案：</strong> <code>./process.py data_${SLURM_ARRAY_TASK_ID}.csv</code></li>
            <li><strong>限制同時執行數：</strong> 範圍設為 <code>0-99%10</code> (總共 100 個任務，最多同時跑 10 個)</li>
            <li><strong>命名規則：</strong> <code>%A</code> 是主作業 ID，<code>%a</code> 是陣列任務索引。</li>
          </ul>
        </div>
      </div>

      <!-- Perf -->
      <div v-if="mode === 'perf'">
        <div class="inline">
          <div class="form-group">
            <label>取樣頻率 (-F)</label>
            <input type="number" v-model.number="perf.freq" min="1" placeholder="999" />
          </div>
          <div class="form-group">
            <label>呼叫圖 (-g)</label>
            <select v-model="perf.callGraph">
              <option value="none">none</option>
              <option value="dwarf">dwarf</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>輸出檔 (record)</label>
          <input type="text" v-model="perf.output" placeholder="perf.data" />
        </div>
        <div class="form-group">
          <label>目標執行檔</label>
          <input type="text" v-model="perf.executable" placeholder="./app" />
        </div>
      </div>

      <!-- Valgrind -->
      <div v-if="mode === 'valgrind'">
        <div class="inline">
          <div class="form-group">
            <label>工具 (--tool)</label>
            <select v-model="valgrind.tool">
              <option value="memcheck">memcheck</option>
              <option value="massif">massif</option>
            </select>
          </div>
          <div class="form-group">
            <label>Leak 檢查</label>
            <select v-model="valgrind.leak">
              <option value="no">no</option>
              <option value="yes">yes</option>
              <option value="full">full</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Log 檔樣板</label>
          <input type="text" v-model="valgrind.logFmt" placeholder="valgrind.%p.log" />
        </div>
        <div class="form-group">
          <label>目標執行檔</label>
          <input type="text" v-model="valgrind.executable" placeholder="./app" />
        </div>
      </div>

      <!-- CUDA-MEMCHECK -->
      <div v-if="mode === 'cuda-memcheck'">
        <div class="form-group">
          <label>工具</label>
          <select v-model="cudaMem.tool">
            <option value="memcheck">memcheck</option>
            <option value="racecheck">racecheck</option>
            <option value="initcheck">initcheck</option>
          </select>
        </div>
        <div class="form-group">
          <label>目標執行檔</label>
          <input type="text" v-model="cudaMem.executable" placeholder="./cuda_app" />
        </div>
      </div>

      <!-- Enhanced Transfer additions in existing transfer tab -->
      <div v-if="mode === 'transfer'">
        <div class="inline">
          <div class="form-group">
            <label>來源 (local 或 remote:path)</label>
            <input type="text" v-model="transfer.src" placeholder="./data/" />
          </div>
          <div class="form-group">
            <label>目的地</label>
            <input type="text" v-model="transfer.dst" placeholder="user@server:/path/" />
          </div>
        </div>
        <div class="checkbox-group">
          <div>
            <input type="checkbox" id="rsync" v-model="transfer.useRsync" />
            <label for="rsync">使用 rsync (否則用 scp)</label>
          </div>
          <div>
            <input type="checkbox" id="compress" v-model="transfer.compress" />
            <label for="compress">壓縮 (-z)</label>
          </div>
          <div>
            <input type="checkbox" id="progress" v-model="transfer.progress" />
            <label for="progress">進度顯示 (--progress)</label>
          </div>
          <div>
            <input type="checkbox" id="archive" v-model="transfer.archive" />
            <label for="archive">保留屬性 (-a)</label>
          </div>
          <div>
            <input type="checkbox" id="checksum" v-model="transfer.checksum" />
            <label for="checksum">檔案校驗 (--checksum)</label>
          </div>
          <div>
            <input type="checkbox" id="delete" v-model="transfer.delete" />
            <label for="delete">刪除檔案 (--delete)</label>
          </div>
        </div>
      </div>

      <!-- Environment Modules -->
      <div v-if="mode === 'modules'">
        <div class="form-group">
          <label>1. 取得 Module 列表</label>
          <p style="color: #8b949e; font-size: 0.9rem; margin-bottom: 8px;">
            請在您的 HPC 叢集上執行以下指令，並將輸出結果貼到下方文字框中：
          </p>
          <div class="code-block" style="margin-bottom: 12px;">
            <div class="code-header">
              <span>終端機指令 (已加入 | cat 避免分頁)</span>
              <button class="copy-btn" @click="handleCopy('module -t avail 2>&1 | cat', $event)">複製</button>
            </div>
            <pre>$ module -t avail 2>&1 | cat</pre>
          </div>
          <textarea v-model="modules.availOutput" rows="6" placeholder="貼上 module -t avail 的輸出結果..."></textarea>
        </div>

        <div class="form-group" v-if="availableModules.length > 0">
          <label>2. 選擇 Modules ({{ modules.selected.length }} 已選)</label>
          <input type="text" v-model="modules.filter" placeholder="搜尋 module..." style="margin-bottom: 12px;" />

          <div class="module-list-container">
            <div v-for="pkg in filteredModules" :key="pkg.name" class="module-group">
              <div class="pkg-name">{{ pkg.name }}</div>
              <div class="pkg-versions">
                <label v-for="ver in pkg.versions" :key="ver" class="version-chip">
                  <input type="checkbox" :value="ver ? `${pkg.name}/${ver}` : pkg.name" v-model="modules.selected" />
                  <span class="chip-content">{{ ver || 'default' }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>手動輸入 (Load)</label>
          <input type="text" v-model="modules.load" placeholder="例如: gcc/12.2 openmpi/4.1.5" />
          <small class="muted">除了上方勾選的項目外，您也可以在此手動輸入 (以空格分隔)。</small>
        </div>

        <div class="form-group">
          <label>手動輸入 (Unload)</label>
          <input type="text" v-model="modules.unload" placeholder="intel" />
        </div>
      </div>

      <!-- PBS to Slurm Converter -->
      <div v-if="mode === 'pbs-to-slurm'">
        <PbsToSlurmConverter />
      </div>

      <!-- Apptainer / Singularity -->
      <div v-if="mode === 'apptainer'">
        <div class="form-group">
          <label>指令 (Command)</label>
          <select v-model="apptainer.command">
            <option value="exec">exec (執行指令)</option>
            <option value="run">run (執行 runscript)</option>
            <option value="shell">shell (進入互動式 shell)</option>
          </select>
        </div>

        <div class="form-group">
          <label>映像檔路徑 (Image Path)</label>
          <input type="text" v-model="apptainer.image" placeholder="image.sif" />
        </div>

        <div class="form-group">
          <label>掛載路徑 (--bind / -B)</label>
          <input type="text" v-model="apptainer.binds" placeholder="/host/path:/container/path, /data" />
        </div>

        <div class="checkbox-group">
          <div>
            <input type="checkbox" id="apt-writable" v-model="apptainer.writable" />
            <label for="apt-writable">可寫入 (--writable)</label>
          </div>
          <div>
            <input type="checkbox" id="apt-nv" v-model="apptainer.nv" />
            <label for="apt-nv">NVIDIA GPU (--nv)</label>
          </div>
          <div>
            <input type="checkbox" id="apt-rocm" v-model="apptainer.rocm" />
            <label for="apt-rocm">AMD ROCm (--rocm)</label>
          </div>
        </div>

        <div class="form-group" v-if="apptainer.command === 'exec'">
          <label>執行指令</label>
          <input type="text" v-model="apptainer.executable" placeholder="./app" />
        </div>

        <div class="form-group">
          <label>其他選項</label>
          <input type="text" v-model="apptainer.options" placeholder="--cleanenv" />
        </div>
      </div>

      <!-- Apptainer Builder -->
      <div v-if="mode === 'apptainer-builder'" style="height: calc(100vh - 150px);">
        <ApptainerBuilder />
      </div>

      <!-- HPL Config Builder -->
      <div v-if="mode === 'hpl'">
        <HplConfigBuilder :config="hpl" :mem-settings="hplMem" />
      </div>

      <!-- STREAM Benchmark -->
      <div v-if="mode === 'stream'">
        <StreamBenchmarkBuilder @send-to-slurm="handleStreamSendToSlurm" />
      </div>

      <!-- OSU Benchmark -->
      <div v-if="mode === 'osu'">
        <OsuBenchmarkBuilder 
          :config="osu" 
          @send-to-mpi="handleOsuSendToMpi"
          @send-to-slurm="handleOsuSendToSlurm"
        />
      </div>

      <!-- FIO Benchmark -->
      <div v-if="mode === 'fio'">
        <FioBenchmarkBuilder @send-to-slurm="handleFioSendToSlurm" />
      </div>

      <div class="result-box" v-if="mode === 'slurm'">
        <div class="code-block">
          <div class="code-header">
            <span>產生腳本 (Write Script)</span>
            <button class="copy-btn" @click="onCopyGenerate($event)">
              <span class="icon">📋</span> 複製
            </button>
          </div>
          <pre>{{ generateWriteSlurmCmd }}</pre>
        </div>

        <div class="code-block" style="margin-top: 16px;">
          <div class="code-header">
            <span>提交作業 (Submit Job)</span>
            <button class="copy-btn" @click="onCopySbatch($event)">
              <span class="icon">📋</span> 複製
            </button>
          </div>
          <pre>$ sbatch {{ slurm.scriptName }}</pre>
        </div>

        <div class="btn-row-bottom" style="margin-top: 16px; display: flex; justify-content: center;">
          <button class="copy-btn primary" @click="tryDownloadSlurm">
            <span class="icon">💾</span> 下載腳本檔案
          </button>
        </div>
      </div>

      <div class="result-box" v-else-if="!['apptainer-builder', 'hpl', 'osu', 'stream', 'pbs-to-slurm'].includes(mode) && generatedCommand">
        <div class="btn-row">
          <button class="copy-btn" @click="copyToClipboard">
            <span class="icon">📋</span> 複製指令
          </button>
          
          <!-- Send to MPI -->
          <button v-if="['apptainer', 'nvprof', 'nsys', 'ncu', 'perf', 'valgrind', 'cuda-memcheck'].includes(mode)" 
                  class="copy-btn" @click="() => {
                    if (mode === 'apptainer') sendApptainerToMpi();
                    if (mode === 'nvprof') sendNvprofToMpi();
                    if (mode === 'nsys') sendNsysToMpi();
                    if (mode === 'ncu') sendNcuToMpi();
                    if (mode === 'perf') sendPerfToMpi();
                    if (mode === 'valgrind') sendValgrindToMpi();
                    if (mode === 'cuda-memcheck') sendCudaMemcheckToMpi();
                  }">傳送到 MPI Runner</button>
          
          <!-- Send to Slurm -->
          <button v-if="['apptainer', 'mpi', 'compile', 'nvprof', 'nsys', 'ncu', 'perf', 'valgrind', 'cuda-memcheck'].includes(mode)" 
                  class="copy-btn" @click="() => {
                    if (mode === 'apptainer') sendApptainerToSlurm();
                    if (mode === 'mpi') sendMpiToSlurm();
                    if (mode === 'compile') sendCompileToSlurm();
                    if (mode === 'nvprof') sendNvprofToSlurm();
                    if (mode === 'nsys') sendNsysToSlurm();
                    if (mode === 'ncu') sendNcuToSlurm();
                    if (mode === 'perf') sendPerfToSlurm();
                    if (mode === 'valgrind') sendValgrindToSlurm();
                    if (mode === 'cuda-memcheck') sendCudaMemcheckToSlurm();
                  }">傳送到 Slurm</button>
        </div>
        $ {{ generatedCommand }}
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Root layout */
:global(body) {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #0d0e10;
  color: #e6e9ef;
  overflow-x: hidden;
}

.app-shell {
  display: grid;
  grid-template-columns: auto 1fr;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  background: #15171b;
  border-right: 1px solid #23262d;
  padding: 16px;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease, padding 0.2s ease;
  z-index: 10;
  height: 100vh;
  position: sticky;
  top: 0;
  box-sizing: border-box;
}

.sidebar.collapsed {
  width: 64px;
  padding: 16px 8px;
}

.sidebar:not(.collapsed) {
  width: 260px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  height: 32px;
}

.brand {
  font-weight: 700;
  font-size: 1.1rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
}

.quick-start-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(56, 139, 253, 0.1);
  border: 1px solid rgba(56, 139, 253, 0.3);
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 20px;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: #58a6ff;
}

.toggle-btn {
  background: transparent;
  color: #8b949e;
  border: 1px solid #30363d;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #21262d;
  color: #fff;
}

.sidebar-search {
  margin-bottom: 16px;
}

.sidebar-search input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #30363d;
  background: #0d1117;
  color: #e6e9ef;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.sidebar-search input:focus {
  outline: none;
  border-color: #58a6ff;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  margin-right: -8px;
  padding-right: 8px;
}

.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background-color: #30363d;
  border-radius: 3px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background-color: #484f58;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-nav li {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  color: #8b949e;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-nav li:hover {
  background: #21262d;
  color: #c9d1d9;
}

.sidebar-nav li.active {
  background: #1f6feb;
  color: #fff;
}

.item-label {
  font-size: 0.95rem;
}

.item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #30363d;
  margin: 0 auto;
}

.sidebar-nav li.active .item-dot {
  background: #fff;
}

/* Main Content */
.content {
  padding: 24px 32px;
  overflow-y: auto;
  height: 100vh;
  box-sizing: border-box;
}

.page-title h1 {
  margin: 0 0 24px;
  font-size: 1.8rem;
  font-weight: 600;
  color: #fff;
}

/* Info banner */
.info-banner {
  background: #1f6feb22;
  border: 1px solid #1f6feb;
  color: #58a6ff;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 0.95rem;
}

/* Forms */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #c9d1d9;
  font-weight: 500;
  font-size: 0.95rem;
}

.inline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

input[type='text'],
input[type='number'],
select,
textarea {
  width: 100%;
  padding: 10px 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6e9ef;
  font-size: 0.95rem;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}

/* Checkboxes */
.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 4px 0;
}

.checkbox-group > div,
.checkbox-group > label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #c9d1d9;
}

input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: #1f6feb;
  cursor: pointer;
}

/* Helper text */
small.muted {
  display: block;
  margin-top: 6px;
  color: #8b949e;
  font-size: 0.85rem;
}

hr {
  border: 0;
  border-top: 1px solid #30363d;
  margin: 24px 0;
}

/* Result Box */
.result-box {
  margin-top: 32px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 20px;
  position: relative;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  color: #7ee787;
  line-height: 1.6;
  word-break: break-all;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.code-block {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 0;
  overflow: hidden;
  margin-bottom: 16px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  color: #8b949e;
  font-size: 0.85rem;
  font-family: 'Inter', system-ui, sans-serif;
}

.code-block pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  color: #7ee787;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.95rem;
}

.btn-row {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
}

.copy-btn {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  font-family: 'Inter', system-ui, sans-serif;
}

.copy-btn.small {
  padding: 4px 10px;
  font-size: 0.75rem;
}

.copy-btn:hover {
  background: #30363d;
  border-color: #8b949e;
  color: #fff;
}

.copy-btn:active {
  background: #282e33;
  transform: translateY(1px);
}

.copy-btn .icon {
  font-size: 1rem;
}

.copy-btn.primary {
  background: #238636;
  border-color: rgba(240, 246, 252, 0.1);
  color: #fff;
}

.copy-btn.primary:hover {
  background: #2ea043;
}

.module-list-container {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #30363d;
  background: #0d1117;
  border-radius: 8px;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  align-content: start;
}

.module-group {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.module-group:last-child {
  /* Reset legacy styles */
  border-bottom: 1px solid #21262d;
  margin-bottom: 0;
  padding-bottom: 12px;
}

.pkg-name {
  font-weight: 600;
  color: #58a6ff;
  margin-bottom: 8px;
  font-size: 0.95rem;
}

.pkg-versions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.version-chip {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.85rem;
  user-select: none;
  position: relative;
}

.version-chip input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.chip-content {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 4px 10px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.version-chip:hover .chip-content {
  background: #30363d;
  border-color: #8b949e;
}

.version-chip input:checked ~ .chip-content {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #ffffff;
}

/* Server Switcher */
.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #30363d;
}

.github-link-container {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #21262d;
}

.github-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8b949e;
  text-decoration: none;
  font-size: 0.8rem;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.github-link:hover {
  background: #21262d;
  color: #58a6ff;
}

.github-link .icon {
  font-weight: bold;
}

.server-switcher label {
  display: block;
  font-size: 0.8rem;
  color: #8b949e;
  margin-bottom: 8px;
}

.server-select-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.server-select-row select {
  flex: 1;
  padding: 6px 8px;
  font-size: 0.85rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6e9ef;
}

.share-btn {
  width: 100%;
  margin-bottom: 8px;
  background: #1f6feb22;
  border: 1px solid #1f6feb44;
  color: #58a6ff;
  padding: 6px;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.share-btn:hover {
  background: #1f6feb44;
  border-color: #58a6ff;
  color: #fff;
}

.config-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.config-actions .share-btn {
  margin-bottom: 0;
  flex: 1;
}

.icon-btn {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #30363d;
  color: #fff;
}

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 12px 24px;
  border-radius: 8px;
  background: #1f6feb;
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.toast.error {
  background: #f85149;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-content h3 {
  margin: 0 0 12px;
  color: #fff;
}

.modal-content p {
  color: #8b949e;
  margin-bottom: 20px;
}

.modal-input {
  width: 100%;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.modal-btn.cancel {
  background: transparent;
  border: 1px solid #30363d;
  color: #c9d1d9;
}

.modal-btn.cancel:hover {
  background: #21262d;
  border-color: #8b949e;
}

.modal-btn.confirm {
  background: #238636;
  border: 1px solid rgba(240, 246, 252, 0.1);
  color: #fff;
}

.modal-btn.confirm:hover {
  background: #2ea043;
}

.modal-btn.confirm.danger {
  background: #da3633;
}

.modal-btn.confirm.danger:hover {
  background: #f85149;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.server-actions {
  display: flex;
  gap: 8px;
}

.server-actions button {
  flex: 1;
  background: transparent;
  border: 1px solid #30363d;
  color: #8b949e;
  font-size: 0.75rem;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.server-actions button:hover {
  color: #fff;
  border-color: #8b949e;
  background: #21262d;
}

.server-actions button.danger:hover {
  color: #f85149;
  border-color: #f85149;
  background: #f8514911;
}

/* Mobile Header */
.mobile-header {
  display: none;
}

/* Responsive */
@media (max-width: 768px) {
  .app-shell {
    grid-template-columns: 1fr;
    display: block;
  }

  .mobile-header {
    display: flex;
    align-items: center;
    padding: 0 16px;
    height: 56px;
    background: #15171b;
    border-bottom: 1px solid #23262d;
    position: sticky;
    top: 0;
    z-index: 100;
    gap: 12px;
  }

  .menu-toggle {
    background: transparent;
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hamburger, .hamburger::before, .hamburger::after {
    content: '';
    display: block;
    width: 20px;
    height: 2px;
    background: #fff;
    position: relative;
    transition: all 0.2s;
  }

  .hamburger::before { top: -6px; }
  .hamburger::after { top: 4px; }

  .mobile-brand {
    font-weight: 700;
    font-size: 1rem;
    white-space: nowrap;
  }

  .mobile-mode-label {
    margin-left: auto;
    font-size: 0.8rem;
    color: #8b949e;
    background: #21262d;
    padding: 4px 8px;
    border-radius: 4px;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar {
    position: fixed;
    left: -280px;
    top: 0;
    bottom: 0;
    width: 280px !important;
    z-index: 200;
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    height: 100vh;
    box-shadow: 10px 0 30px rgba(0,0,0,0.5);
  }

  .sidebar.mobile-open {
    left: 0;
  }

  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(2px);
    z-index: 150;
  }

  .content {
    padding: 16px !important;
  }

  .page-title {
    display: none; /* Hidden on mobile because it's in the header */
  }

  .desktop-only {
    display: none !important;
  }

  /* Component specific responsive fixes */
  .inline {
    flex-direction: column !important;
    gap: 0 !important;
  }

  .config-grid {
    grid-template-columns: 1fr !important;
  }

  .result-box {
    padding: 12px !important;
  }

  .quick-start-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .quick-start-banner .copy-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>

<style>
/* Global responsive utilities */
@media (max-width: 768px) {
  .inline {
    flex-direction: column !important;
    gap: 0 !important;
  }
  .config-grid {
    grid-template-columns: 1fr !important;
  }
  .form-group {
    width: 100% !important;
  }
}
</style>
