<script setup>
import { reactive, computed } from 'vue';
import { FIO_DEFAULTS, FIO_TEMPLATES, buildFioCmd } from '../utils/fio';
import CustomSelect from './CustomSelect.vue';

const emit = defineEmits(['send-to-slurm']);

const config = reactive({ ...FIO_DEFAULTS });

const generatedCmd = computed(() => buildFioCmd(config));

const applyTemplate = (template) => {
  Object.assign(config, template.config);
};

const handleCopy = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    alert('已複製到剪貼簿！');
  });
};

const sendToSlurm = () => {
  emit('send-to-slurm', generatedCmd.value);
};
</script>

<template>
  <div class="fio-builder">
    <div class="info-banner">
      <span class="icon">💾</span>
      <p>
        <strong>FIO (Flexible I/O Tester)</strong> 是測試磁碟效能的標準工具。
        支援多種 I/O 模式、區塊大小與並行測試。
      </p>
    </div>

    <div class="template-row">
      <span class="label">快速範本:</span>
      <div class="chips">
        <button 
          v-for="t in FIO_TEMPLATES" 
          :key="t.id" 
          class="chip-btn"
          @click="applyTemplate(t)"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="config-grid">
      <div class="config-section">
        <h4>基本設定</h4>
        <div class="form-group">
          <label>測試名稱 (--name)</label>
          <input type="text" v-model="config.name" />
        </div>
        <div class="form-group">
          <label>測試檔案/路徑 (--filename)</label>
          <input type="text" v-model="config.filename" placeholder="例如: /mnt/scratch/testfile" />
          <small class="muted">注意：測試會覆蓋或建立此檔案。</small>
        </div>
        <div class="inline">
          <div class="form-group">
            <label>測試模式 (--rw)</label>
            <CustomSelect 
              v-model="config.rw" 
              :options="[
                { value: 'read', label: 'Sequential Read' },
                { value: 'write', label: 'Sequential Write' },
                { value: 'randread', label: 'Random Read' },
                { value: 'randwrite', label: 'Random Write' },
                { value: 'rw', label: 'Mixed Seq R/W' },
                { value: 'randrw', label: 'Mixed Rand R/W' }
              ]" 
            />
          </div>
          <div class="form-group">
            <label>區塊大小 (--bs)</label>
            <input type="text" v-model="config.bs" placeholder="例如: 4k, 1M" />
          </div>
        </div>
      </div>

      <div class="config-section">
        <h4>效能與負載</h4>
        <div class="inline">
          <div class="form-group">
            <label>測試大小 (--size)</label>
            <input type="text" v-model="config.size" placeholder="例如: 1G, 10G" />
          </div>
          <div class="form-group">
            <label>測試時長 (秒)</label>
            <input type="number" v-model.number="config.runtime" min="1" />
          </div>
        </div>
        <div class="inline">
          <div class="form-group">
            <label>並行作業數 (--numjobs)</label>
            <input type="number" v-model.number="config.numjobs" min="1" />
          </div>
          <div class="form-group">
            <label>I/O 深度 (--iodepth)</label>
            <input type="number" v-model.number="config.iodepth" min="1" />
          </div>
        </div>
        <div class="inline">
          <div class="form-group">
            <label>I/O 引擎</label>
            <CustomSelect 
              v-model="config.ioengine" 
              :options="[
                { value: 'libaio', label: 'libaio (Linux Async)' },
                { value: 'sync', label: 'sync (Standard)' },
                { value: 'posixaio', label: 'posixaio' },
                { value: 'mmap', label: 'mmap' }
              ]" 
            />
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px; padding-top: 25px;">
            <input type="checkbox" id="direct-io" v-model="config.direct" :true-value="1" :false-value="0" />
            <label for="direct-io" style="margin-bottom: 0;">Direct I/O (跳過快取)</label>
          </div>
        </div>
      </div>
    </div>

    <div class="result-area">
      <div class="result-block">
        <div class="block-header">
          <span>FIO 指令預覽</span>
          <button @click="handleCopy(generatedCmd)">複製指令</button>
        </div>
        <pre>{{ generatedCmd }}</pre>
      </div>

      <div class="actions-row">
        <button class="primary-btn" @click="sendToSlurm">🚀 傳送到 Slurm 腳本</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fio-builder {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(243, 156, 18, 0.1);
  border: 1px solid rgba(243, 156, 18, 0.3);
  border-radius: 8px;
  font-size: 0.9rem;
}

.template-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-background-soft);
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.template-row .label {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-text);
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip-btn {
  background: #21262d;
  border: 1px solid #30363d;
  color: #58a6ff;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.chip-btn:hover {
  background: #30363d;
  border-color: #58a6ff;
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

input[type="text"], input[type="number"] {
  width: 100%;
  background: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  border-radius: 6px;
}

.result-area {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.result-block {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
}

.block-header {
  background: #161b22;
  padding: 10px 16px;
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
}

pre {
  margin: 0;
  padding: 16px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.95rem;
  color: #7ee787;
  white-space: pre-wrap;
  word-break: break-all;
}

.actions-row {
  display: flex;
  justify-content: center;
}

.primary-btn {
  background: #238636;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn:hover {
  background: #2ea043;
}

.muted {
  color: #8b949e;
  font-size: 0.75rem;
  display: block;
  margin-top: 4px;
}
</style>
