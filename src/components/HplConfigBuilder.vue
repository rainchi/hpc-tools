<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { HPL_PARAMETERS, parseHplDat, generateHplDat, suggestN, suggestPQ, getNearbySuggestions } from '../utils/hpl';

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  memSettings: {
    type: Object,
    required: true
  }
});

const hplText = ref('');
const activeHelpParam = ref(null);
const totalProcessesInput = ref(4);

const suggestedPQ = computed(() => {
  return suggestPQ(totalProcessesInput.value);
});

const nearbySuggestions = computed(() => {
  if (totalProcessesInput.value > 3 && suggestedPQ.value.p === 1) {
    return getNearbySuggestions(totalProcessesInput.value);
  }
  return [];
});

const handleSuggestPQ = (n, p, q) => {
  if (n) totalProcessesInput.value = n;
  props.config.ps = [p || suggestedPQ.value.p];
  props.config.qs = [q || suggestedPQ.value.q];
};

const handleParse = () => {
  const parsed = parseHplDat(hplText.value);
  if (parsed) {
    Object.keys(parsed).forEach(key => {
      props.config[key] = parsed[key];
    });
  } else {
    alert('無法解析 HPL.dat，請檢查格式是否正確。');
  }
};

const handleGenerate = () => {
  hplText.value = generateHplDat(props.config);
};

const handleSuggestN = () => {
  const { memoryGB, usageRatio, memoryType, gpuCount } = props.memSettings;
  const totalMem = memoryType === 'gpu' ? memoryGB * gpuCount : memoryGB;
  const n = suggestN(totalMem, usageRatio);
  props.config.ns = [n];
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(hplText.value);
};

// Auto generate on change
watch(() => props.config, () => {
  handleGenerate();
}, { deep: true });

onMounted(() => {
  handleGenerate();
});

const updateList = (key, value) => {
  if (typeof value === 'string') {
    props.config[key] = value.split(/[\s,]+/).map(v => isNaN(v) ? v : Number(v));
  }
};
</script>

<template>
  <div class="hpl-builder">
    <!-- Help Modal -->
    <transition name="fade">
      <div v-if="activeHelpParam" class="modal-overlay" @click.self="activeHelpParam = null">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ activeHelpParam.label }}</h3>
            <button class="close-btn" @click="activeHelpParam = null">×</button>
          </div>
          <div class="modal-body">
            <pre>{{ activeHelpParam.details }}</pre>
          </div>
        </div>
      </div>
    </transition>

    <div class="inline" style="grid-template-columns: 1fr 1fr; align-items: start;">
      <!-- Left: Form -->
      <div class="form-container">
        <div class="section-title">⚙️ HPL 參數設定</div>
        
        <div class="memory-suggestion">
          <label class="suggestion-label">N 大小建議 (根據記憶體)</label>
          <div class="inline" style="grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div class="form-group">
              <label>記憶體類型</label>
              <select v-model="memSettings.memoryType">
                <option value="cpu">系統記憶體 (CPU)</option>
                <option value="gpu">顯示記憶體 (GPU VRAM)</option>
              </select>
            </div>
            <div class="form-group">
              <label>總容量 (GB)</label>
              <input v-model.number="memSettings.memoryGB" type="number" />
            </div>
          </div>
          <div class="inline" style="grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label>使用率 (建議 0.8-0.9)</label>
              <input v-model.number="memSettings.usageRatio" type="number" step="0.05" />
            </div>
            <div v-if="memSettings.memoryType === 'gpu'" class="form-group">
              <label>GPU 數量</label>
              <input v-model.number="memSettings.gpuCount" type="number" />
            </div>
          </div>
          <div class="btn-row" style="margin-top: 8px; position: static;">
            <button class="action-btn suggest" @click="handleSuggestN">
              <span class="icon">✨</span> 套用建議 N
            </button>
          </div>
          <div class="suggestion-result">
            建議 N: <strong>{{ suggestN(memSettings.memoryType === 'gpu' ? memSettings.memoryGB * memSettings.gpuCount : memSettings.memoryGB, memSettings.usageRatio) }}</strong> 
            (約佔用 {{ ((memSettings.memoryType === 'gpu' ? memSettings.memoryGB * memSettings.gpuCount : memSettings.memoryGB) * memSettings.usageRatio).toFixed(2) }} GB)
            <div v-if="memSettings.memoryType === 'gpu'" class="warning-text">* GPU 模式下請確保 N 是 NB 的倍數。</div>
          </div>
        </div>

        <div class="memory-suggestion">
          <label class="suggestion-label">P x Q 建議 (根據總行程數)</label>
          <div class="inline" style="grid-template-columns: 1fr 1fr; gap: 8px; align-items: end;">
            <div class="form-group">
              <label>總 MPI 行程數 (Total Processes)</label>
              <input v-model.number="totalProcessesInput" type="number" min="1" />
            </div>
            <div class="btn-row" style="margin-bottom: 0; position: static;">
              <button class="action-btn suggest" @click="handleSuggestPQ" style="background: #1f6feb;">
                <span class="icon">✨</span> 套用建議 P x Q
              </button>
            </div>
          </div>
          <div class="suggestion-result">
            建議組合: <strong>P = {{ suggestedPQ.p }}, Q = {{ suggestedPQ.q }}</strong>
            <span class="muted" style="margin-left: 8px;">(P x Q = {{ suggestedPQ.p * suggestedPQ.q }})</span>
            
            <div v-if="nearbySuggestions.length > 0" class="nearby-warning">
              <div class="warning-header">⚠️ 注意：{{ totalProcessesInput }} 是質數或因數分解較差</div>
              <div class="warning-body">
                這會導致網格變成 1 x {{ totalProcessesInput }}，通常效能不佳。建議改用：
                <div class="suggestion-chips">
                  <button 
                    v-for="s in nearbySuggestions" 
                    :key="s.n" 
                    class="chip-btn"
                    @click="handleSuggestPQ(s.n, s.p, s.q)"
                  >
                    {{ s.n }} ({{ s.p }}x{{ s.q }})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="params-grid">
          <div v-for="param in HPL_PARAMETERS" :key="param.key" class="form-group">
            <div class="label-row">
              <div class="label-wrap">
                <label>{{ param.label }}</label>
                <button v-if="param.details" class="info-icon" @click="activeHelpParam = param" title="點擊查看詳細說明">
                  ℹ️
                </button>
              </div>
              <span class="param-desc">{{ param.desc }}</span>
            </div>
            
            <template v-if="Array.isArray(config[param.key])">
              <input 
                :value="config[param.key].join(' ')" 
                @input="e => updateList(param.key, e.target.value)"
                type="text" 
                placeholder="多個數值請用空格隔開"
              />
              <div v-if="param.options" class="options-hint">
                <span v-for="opt in param.options" :key="opt.value" class="option-tag" @click="() => {
                  if (!config[param.key].includes(opt.value)) {
                    config[param.key].push(opt.value);
                  }
                }">
                  {{ opt.value }}={{ opt.label }}
                </span>
              </div>
            </template>
            <template v-else-if="param.options">
              <select v-model.number="config[param.key]">
                <option v-for="opt in param.options" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </template>
            <template v-else-if="typeof config[param.key] === 'number'">
              <input 
                v-model.number="config[param.key]" 
                type="number" 
              />
            </template>
            <template v-else>
              <input 
                v-model="config[param.key]" 
                type="text" 
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Right: Output/Input -->
      <div class="output-container">
        <div class="section-title">HPL.dat 預覽 / 貼上現有設定</div>
        <div class="code-block">
          <div class="code-header">
            <span>HPL.dat</span>
            <div class="btn-group">
              <button class="action-btn parse" @click="handleParse">
                <span class="icon">📥</span> 解析貼上內容
              </button>
              <button class="action-btn copy" @click="copyToClipboard">
                <span class="icon">📋</span> 複製
              </button>
            </div>
          </div>
          <textarea 
            v-model="hplText" 
            class="hpl-textarea"
            spellcheck="false"
            rows="30"
          ></textarea>
        </div>
        <p class="muted" style="margin-top: 8px;">
          * 您可以直接在此處貼上現有的 HPL.dat 內容，然後點擊「解析貼上內容」來同步到左側表單。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hpl-builder {
  padding: 0;
  max-width: 100%;
  margin: 0;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #e6edf3;
  border-bottom: 1px solid #30363d;
  padding-bottom: 6px;
}

.memory-suggestion {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.suggestion-label {
  display: block;
  font-weight: 600;
  color: #58a6ff;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.suggestion-result {
  margin-top: 12px;
  font-size: 0.85rem;
  color: #8b949e;
  background: #0d1117;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #30363d;
}

.suggestion-result strong {
  color: #3fb950;
  font-size: 1rem;
}

.warning-text {
  color: #d29922;
  font-size: 0.75rem;
  margin-top: 4px;
  display: block;
}

.nearby-warning {
  margin-top: 10px;
  padding: 8px;
  background: rgba(210, 153, 34, 0.1);
  border: 1px solid rgba(210, 153, 34, 0.3);
  border-radius: 6px;
}

.warning-header {
  color: #d29922;
  font-weight: 600;
  font-size: 0.8rem;
  margin-bottom: 4px;
}

.warning-body {
  font-size: 0.75rem;
  color: #c9d1d9;
}

.suggestion-chips {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.chip-btn {
  background: #21262d;
  border: 1px solid #30363d;
  color: #58a6ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.chip-btn:hover {
  background: #30363d;
  border-color: #58a6ff;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.form-group {
  background: #161b22;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #30363d;
  transition: border-color 0.2s;
}

.form-group:hover {
  border-color: #58a6ff;
}

.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #c9d1d9;
  margin-bottom: 4px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.label-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.info-icon:hover {
  opacity: 1;
}

.param-desc {
  font-size: 0.7rem;
  color: #8b949e;
}

/* Modal Styles */
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
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid #30363d;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #e6edf3;
  font-size: 1.1rem;
}

.close-btn {
  background: none;
  border: none;
  color: #8b949e;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #e6edf3;
}

.modal-body {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-body pre {
  white-space: pre-wrap;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9rem;
  color: #c9d1d9;
  margin: 0;
  line-height: 1.5;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

input[type="text"],
input[type="number"],
select {
  width: 100%;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: inherit;
  transition: all 0.2s;
}

input:focus,
select:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.1);
}

.hpl-textarea {
  width: 100%;
  background: #0d1117;
  color: #3fb950;
  border: none;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
  padding: 12px;
  resize: vertical;
  min-height: 600px;
  outline: none;
  line-height: 1.4;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(240, 246, 252, 0.1);
}

.action-btn.parse {
  background: #238636;
  color: #ffffff;
}

.action-btn.parse:hover {
  background: #2ea043;
}

.action-btn.copy {
  background: #1f6feb;
  color: #ffffff;
}

.action-btn.copy:hover {
  background: #388bfd;
}

.action-btn.suggest {
  background: #8957e5;
  color: #ffffff;
  width: 100%;
  justify-content: center;
  padding: 6px 12px;
}

.action-btn.suggest:hover {
  background: #a371f7;
}

.action-btn .icon {
  font-size: 1rem;
}

.code-block {
  border: 1px solid #30363d;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.code-header {
  background: #161b22;
  padding: 6px 12px;
  border-bottom: 1px solid #30363d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #8b949e;
  font-size: 0.8rem;
  font-weight: 600;
}

.options-hint {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.option-tag {
  font-size: 0.7rem;
  background: #21262d;
  color: #8b949e;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.option-tag:hover {
  color: #58a6ff;
  border-color: #58a6ff;
  background: #1f6feb11;
}

.muted {
  color: #8b949e;
  font-size: 0.75rem;
}

/* Layout adjustments */
.inline {
  display: grid;
  gap: 16px;
}

@media (max-width: 1024px) {
  .inline {
    grid-template-columns: 1fr !important;
  }
  
  .params-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .params-grid {
    grid-template-columns: 1fr;
  }
}
</style>
