<script setup>
import { ref, computed } from 'vue';
import { convertPbsToSlurm } from '../utils/converters';

const pbsInput = ref(`#PBS -N my_job
#PBS -q workq
#PBS -l nodes=2:ppn=8
#PBS -l walltime=00:30:00
#PBS -o output.log
#PBS -e error.log
#PBS -m abe
#PBS -M user@example.com

cd $PBS_O_WORKDIR
mpirun -np 16 ./my_executable`);

const slurmOutput = computed(() => {
  return convertPbsToSlurm(pbsInput.value);
});

const handleCopy = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    alert('已複製到剪貼簿！');
  });
};

const downloadScript = () => {
  const blob = new Blob([slurmOutput.value], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'submit.slurm';
  a.click();
  URL.revokeObjectURL(a.href);
};
</script>

<template>
  <div class="converter-container">
    <div class="info-banner">
      <span class="icon">ℹ️</span>
      <p>將舊有的 PBS/Torque 腳本內容貼在左側，右側將自動轉譯為 Slurm 格式。</p>
    </div>

    <div class="editor-grid">
      <div class="editor-pane">
        <div class="pane-header">
          <span>PBS Script (Input)</span>
          <button class="clear-btn" @click="pbsInput = ''">清除</button>
        </div>
        <textarea 
          v-model="pbsInput" 
          placeholder="#PBS -N job..." 
          spellcheck="false"
        ></textarea>
      </div>

      <div class="editor-pane">
        <div class="pane-header">
          <span>Slurm Script (Output)</span>
          <div class="actions">
            <button @click="handleCopy(slurmOutput)">複製</button>
            <button @click="downloadScript">下載</button>
          </div>
        </div>
        <textarea 
          :value="slurmOutput" 
          readonly 
          spellcheck="false"
          class="readonly-output"
        ></textarea>
      </div>
    </div>

    <div class="mapping-table">
      <h4>常見對照表</h4>
      <table>
        <thead>
          <tr>
            <th>功能</th>
            <th>PBS (Torque)</th>
            <th>Slurm</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>作業名稱</td>
            <td><code>#PBS -N name</code></td>
            <td><code>#SBATCH --job-name=name</code></td>
          </tr>
          <tr>
            <td>佇列/分區</td>
            <td><code>#PBS -q queue</code></td>
            <td><code>#SBATCH --partition=queue</code></td>
          </tr>
          <tr>
            <td>節點數量</td>
            <td><code>#PBS -l nodes=N</code></td>
            <td><code>#SBATCH --nodes=N</code></td>
          </tr>
          <tr>
            <td>每節點核心數</td>
            <td><code>#PBS -l ppn=M</code></td>
            <td><code>#SBATCH --ntasks-per-node=M</code></td>
          </tr>
          <tr>
            <td>執行時間</td>
            <td><code>#PBS -l walltime=H:M:S</code></td>
            <td><code>#SBATCH --time=H:M:S</code></td>
          </tr>
          <tr>
            <td>工作目錄變數</td>
            <td><code>$PBS_O_WORKDIR</code></td>
            <td><code>$SLURM_SUBMIT_DIR</code></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.converter-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(66, 184, 131, 0.1);
  border: 1px solid rgba(66, 184, 131, 0.3);
  border-radius: 8px;
  font-size: 0.9rem;
}

.editor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  min-height: 400px;
}

.editor-pane {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: #8b949e;
  padding: 4px 0;
}

textarea {
  flex: 1;
  background: #0d1117;
  color: #e6e9ef;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9rem;
  resize: none;
  line-height: 1.6;
}

textarea:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}

.readonly-output {
  background: #161b22;
  color: #7ee787;
  cursor: default;
}

.actions, .clear-btn {
  display: flex;
  gap: 8px;
}

button {
  padding: 6px 12px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

button:hover {
  background: #30363d;
  border-color: #8b949e;
  color: #fff;
}

.mapping-table {
  background: var(--color-background-soft);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.mapping-table h4 {
  margin-top: 0;
  margin-bottom: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th, td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
}

th {
  color: var(--color-heading);
}

code {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 4px;
  border-radius: 3px;
  color: #e06c75;
}
</style>
