<script setup>
import { ref, computed, watch } from 'vue';
import { OSU_CATEGORIES, buildOsuCmd } from '../utils/osu';
import CustomSelect from './CustomSelect.vue';

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['send-to-mpi', 'send-to-slurm']);

const categories = OSU_CATEGORIES;

const currentBenchmarks = computed(() => {
  return categories[props.config.category]?.benchmarks || [];
});

const osuExecutable = computed(() => {
  return buildOsuCmd(props.config);
});

watch(() => props.config.category, (newCat) => {
  if (categories[newCat]?.benchmarks.length > 0) {
    props.config.benchmark = categories[newCat].benchmarks[0].value;
  }
});

const sendToMpi = () => {
  emit('send-to-mpi', osuExecutable.value);
};

const sendToSlurm = () => {
  emit('send-to-slurm', osuExecutable.value);
};

const copyToClipboard = (event) => {
  navigator.clipboard.writeText(osuExecutable.value);
  const btn = event.target;
  const originalText = btn.innerText;
  btn.innerText = '已複製！';
  setTimeout(() => {
    btn.innerText = originalText;
  }, 2000);
};

// Initialize
if (!props.config.category) props.config.category = 'pt2pt';
if (!props.config.benchmark) props.config.benchmark = 'osu_latency';
if (!props.config.device) props.config.device = 'cpu';
</script>

<template>
  <div class="osu-builder">
    <div class="form-group">
      <label>測試類別</label>
      <div class="category-selector">
        <button 
          v-for="(cat, key) in categories" 
          :key="key"
          :class="['cat-btn', { active: config.category === key }]"
          @click="config.category = key"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <div class="inline">
      <div class="form-group">
        <label>具體測試項目</label>
        <CustomSelect 
          v-model="config.benchmark" 
          :options="currentBenchmarks" 
        />
      </div>
      <div class="form-group">
        <label>加速裝置 (Device)</label>
        <CustomSelect 
          v-model="config.device" 
          :options="[
            { value: 'cpu', label: 'CPU (預設)' },
            { value: 'cuda', label: 'NVIDIA GPU (CUDA)' },
            { value: 'rocm', label: 'AMD GPU (ROCm)' }
          ]" 
        />
      </div>
    </div>

    <div class="form-group">
      <label>OSU 安裝路徑 (選填)</label>
      <input 
        v-model="config.mpiPath" 
        type="text" 
        placeholder="例如: /usr/local/libexec/osu-micro-benchmarks/mpi" 
      />
      <small class="help-text">若留空則假設測試程式已在 PATH 中</small>
    </div>

    <div class="code-block">
      <div class="code-header">
        <span>產生的 Benchmark 指令</span>
        <button class="copy-btn" @click="copyToClipboard">複製</button>
      </div>
      <pre><code>{{ osuExecutable }}</code></pre>
    </div>
    
    <div class="action-buttons">
      <button class="btn btn-primary" @click="sendToMpi">
        <span class="btn-icon">▶️</span> 傳送至 MPI Runner
      </button>
      <button class="btn btn-secondary" @click="sendToSlurm">
        <span class="btn-icon">📝</span> 傳送至 Slurm 腳本
      </button>
    </div>
  </div>
</template>

<style scoped>
.osu-builder {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-selector {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.cat-btn {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.cat-btn:hover {
  border-color: var(--accent-color);
  background: rgba(var(--accent-rgb), 0.1);
}

.cat-btn.active {
  background: var(--accent-color, #3b82f6);
  color: white;
  border-color: var(--accent-color, #3b82f6);
}

.help-text {
  font-size: 0.8rem;
  color: #8b949e;
  margin-top: 4px;
}

.code-block {
  background: #1e1e1e;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
}

.code-header {
  background: #2d333b;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: #8b949e;
  border-bottom: 1px solid #444;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.copy-btn {
  background: #444;
  border: none;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}

.copy-btn:hover {
  background: #555;
}

.code-block pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
}

.code-block code {
  font-family: 'Fira Code', monospace;
  color: #d4d4d4;
}

.action-buttons {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.btn {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.9;
}

.btn-primary {
  background: #238636;
  color: white;
}

.btn-secondary {
  background: #30363d;
  color: white;
  border: 1px solid #8b949e;
}

/* Reuse global styles implicitly or define them if scoped */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inline {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

input, select {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
}

input:focus, select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);
}
</style>
