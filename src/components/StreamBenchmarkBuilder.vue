<script setup>
import { reactive, computed } from 'vue';
import { STREAM_DEFAULTS, buildStreamCompileCmd, buildStreamRunCmd } from '../utils/stream';
import CustomSelect from './CustomSelect.vue';

const emit = defineEmits(['send-to-slurm']);

const config = reactive({ ...STREAM_DEFAULTS });

const compileCmd = computed(() => buildStreamCompileCmd(config));
const runCmd = computed(() => buildStreamRunCmd(config));

// Memory usage calculation
const memoryUsageGB = computed(() => {
  const bytesPerElement = config.type === 'double' ? 8 : 4;
  // STREAM uses 3 arrays (a, b, c)
  const totalBytes = config.arraySize * bytesPerElement * 3;
  return (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
});

const handleCopy = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    alert('已複製到剪貼簿！');
  });
};

const sendToSlurm = () => {
  const fullCmd = `${compileCmd.value} && ${runCmd.value}`;
  emit('send-to-slurm', fullCmd);
};
</script>

<template>
  <div class="stream-builder">
    <div class="info-banner">
      <span class="icon">🌊</span>
      <p>
        <strong>STREAM Benchmark</strong> 是測量永續記憶體頻寬（Sustainable Memory Bandwidth）的業界標準。
        它包含四種操作：Copy, Scale, Add, Triad。
      </p>
    </div>

    <div class="config-grid">
      <div class="config-section">
        <h4>編譯參數 (Compilation)</h4>
        <div class="form-group">
          <label>陣列大小 (STREAM_ARRAY_SIZE)</label>
          <input type="number" v-model.number="config.arraySize" step="1000000" />
          <small class="muted">預估記憶體佔用: {{ memoryUsageGB }} GB (建議至少為 CPU Cache 的 4 倍)</small>
        </div>

        <div class="inline">
          <div class="form-group">
            <label>重複次數 (NTIMES)</label>
            <input type="number" v-model.number="config.ntimes" min="1" />
          </div>
          <div class="form-group">
            <label>資料型別</label>
            <CustomSelect 
              v-model="config.type" 
              :options="[
                { value: 'double', label: 'Double (8-byte)' },
                { value: 'float', label: 'Float (4-byte)' }
              ]" 
            />
          </div>
        </div>

        <div class="inline">
          <div class="form-group">
            <label>編譯器</label>
            <CustomSelect 
              v-model="config.compiler" 
              :options="[
                { value: 'gcc', label: 'GCC' },
                { value: 'icc', label: 'Intel ICC' },
                { value: 'clang', label: 'Clang' }
              ]" 
            />
          </div>
          <div class="form-group">
            <label>優化等級</label>
            <input type="text" v-model="config.optimization" />
          </div>
        </div>
      </div>

      <div class="config-section">
        <h4>執行參數 (Execution)</h4>
        <div class="checkbox-group">
          <label>
            <input type="checkbox" v-model="config.openmp" />
            啟用 OpenMP 多執行緒
          </label>
        </div>

        <div class="form-group" v-if="config.openmp">
          <label>執行緒數量 (OMP_NUM_THREADS)</label>
          <input type="number" v-model.number="config.numThreads" min="1" />
          <small class="muted">通常設定為實體核心數以獲得最大頻寬。</small>
        </div>

        <div class="download-hint">
          <p>尚未擁有原始碼？</p>
          <code>wget https://www.cs.virginia.edu/stream/FTP/Code/stream.c</code>
        </div>
      </div>
    </div>

    <div class="result-area">
      <div class="result-block">
        <div class="block-header">
          <span>1. 編譯指令</span>
          <button @click="handleCopy(compileCmd)">複製</button>
        </div>
        <pre>{{ compileCmd }}</pre>
      </div>

      <div class="result-block">
        <div class="block-header">
          <span>2. 執行指令</span>
          <button @click="handleCopy(runCmd)">複製</button>
        </div>
        <pre>{{ runCmd }}</pre>
      </div>

      <div class="actions-row">
        <button class="primary-btn" @click="sendToSlurm">🚀 傳送到 Slurm 腳本</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stream-builder {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(52, 152, 219, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.3);
  border-radius: 8px;
  font-size: 0.9rem;
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.config-section {
  background: var(--color-background-soft);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--color-heading);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
}

.inline {
  display: flex;
  gap: 15px;
}

.form-group {
  margin-bottom: 15px;
  flex: 1;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 5px;
  color: var(--color-text);
}

input[type="number"], input[type="text"] {
  width: 100%;
  background: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 6px 10px;
  border-radius: 4px;
}

.checkbox-group {
  margin-bottom: 15px;
}

.download-hint {
  margin-top: 20px;
  padding: 10px;
  background: rgba(0,0,0,0.2);
  border-radius: 4px;
  font-size: 0.8rem;
}

.download-hint code {
  display: block;
  margin-top: 5px;
  color: #e06c75;
}

.result-area {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.result-block {
  background: #1e1e1e;
  border-radius: 6px;
  overflow: hidden;
}

.block-header {
  background: #161b22;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #8b949e;
  border-bottom: 1px solid #30363d;
}

.block-header button {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.block-header button:hover {
  background: #30363d;
  border-color: #8b949e;
  color: #fff;
}

pre {
  margin: 0;
  padding: 12px;
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  color: #42b883;
  white-space: pre-wrap;
  word-break: break-all;
}

.actions-row {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.primary-btn {
  background: #42b883;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn:hover {
  background: #33a06f;
}

.muted {
  color: #8b949e;
  font-size: 0.75rem;
  display: block;
  margin-top: 4px;
}
</style>
