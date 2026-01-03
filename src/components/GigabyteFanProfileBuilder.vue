<script setup>
import { ref, reactive, watch, computed } from 'vue';

const defaultJson = {"strVersion":"1.00","arrProfile":[{"strVersion":"1.00","strName":"default","arrPolicy":[{"arrRef":[55,88],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[30,100],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[1,2],"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[25,100],"iCpuTdp":0,"iInitDuty":25,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[4,5],"arrFanSensor":[160,161,166,167],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[25,100],"iCpuTdp":0,"iInitDuty":25,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[6,7],"arrFanSensor":[168,169,174,175],"iHysteresis":0,"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,68],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[25,100],"iCpuTdp":0,"iInitDuty":25,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[28,29,30],"arrFanSensor":[162,163,164,165,166,167,168,169,170,171,172,173],"iHysteresis":0,"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[55,66],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[30,100],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[56,57],"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrDuty":[30,100],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrRef":[55,85],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[36,39],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"arrDuty":[30,100],"iSensorCode":1,"iInSDR":1,"arrRef":[50,85],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[32,33],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"arrDuty":[30,100],"iSensorCode":1,"iInSDR":1,"arrRef":[60,88],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[48,49],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"iPCIEDeviceEnable":0,"arrRef":[50,85],"iSensorCode":1,"iInSDR":1,"arrDuty":[30,100],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[14,15,76,78,79],"arrFanSensor":[160,161,162,163,164,165,166,167],"iHysteresis":0,"iPolicyType":2,"arrHexDeviceID":[],"iAmbientSensor":0},{"iPolicyType":2,"iInSDR":1,"iSensorCode":1,"iInitDuty":30,"iCpuTdp":0,"iAmbientSensor":0,"iAmbientSensorTemp":0,"arrSensor":[16,17,72,74,86],"arrFanSensor":[168,169,170,171,172,173,174,175],"arrRef":[50,85],"arrDuty":[30,100],"arrHexVendorID":[],"arrHexDeviceID":[],"iPCIEDeviceEnable":0,"iHysteresis":0}]},{"strVersion":"1.00","strName":"SPECpower","arrPolicy":[{"arrRef":[60,88],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[1,2],"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[4,5],"arrFanSensor":[160,161,166,167],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[6,7],"arrFanSensor":[168,169,174,175],"iHysteresis":0,"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,68],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[28,29,30],"arrFanSensor":[162,163,164,165,166,167,168,169,170,171,172,173],"iHysteresis":0,"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[55,66],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[56,57],"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrDuty":[15,100],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrRef":[55,85],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[36,39],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"arrDuty":[15,100],"iSensorCode":1,"iInSDR":1,"arrRef":[50,85],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[32,33],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"arrDuty":[15,100],"iSensorCode":1,"iInSDR":1,"arrRef":[60,88],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[48,49],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"iPCIEDeviceEnable":0,"arrRef":[50,85],"iSensorCode":1,"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[14,15,76,78,79],"arrFanSensor":[160,161,162,163,164,165,166,167],"iHysteresis":0,"iPolicyType":2,"arrHexDeviceID":[],"iAmbientSensor":0},{"iPolicyType":2,"iInSDR":1,"iSensorCode":1,"iInitDuty":15,"iCpuTdp":0,"iAmbientSensor":0,"iAmbientSensorTemp":0,"arrSensor":[16,17,72,74,86],"arrFanSensor":[168,169,170,171,172,173,174,175],"arrRef":[55,85],"arrDuty":[15,100],"arrHexVendorID":[],"arrHexDeviceID":[],"iPCIEDeviceEnable":0,"iHysteresis":0}]},{"strVersion":"1.00","strName":"isc","arrPolicy":[{"arrRef":[75,88],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[10,100],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[1,2],"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[60,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[10,100],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[4,5],"arrFanSensor":[160,161,166,167],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[60,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[10,100],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[6,7],"arrFanSensor":[168,169,174,175],"iHysteresis":0,"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrDuty":[10,25,100],"iSensorCode":1,"iInSDR":1,"arrRef":[75,83,85],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[32,33],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"arrDuty":[10,100],"iSensorCode":1,"iInSDR":1,"arrRef":[60,88],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[48,49],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"iPCIEDeviceEnable":0,"arrRef":[60,85],"iSensorCode":1,"iInSDR":1,"arrDuty":[10,100],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[14,15,76,78,79],"arrFanSensor":[160,161,162,163,164,165,166,167],"iHysteresis":0,"iPolicyType":2,"arrHexDeviceID":[],"iAmbientSensor":0},{"iPolicyType":2,"iInSDR":1,"iSensorCode":1,"iInitDuty":10,"iCpuTdp":0,"iAmbientSensor":0,"iAmbientSensorTemp":0,"arrSensor":[16,17,72,74,86],"arrFanSensor":[168,169,170,171,172,173,174,175],"arrRef":[60,85],"arrDuty":[10,100],"arrHexVendorID":[],"arrHexDeviceID":[],"iPCIEDeviceEnable":0,"iHysteresis":0}]}],"strMode":"isc"};

const fanProfile = reactive(JSON.parse(JSON.stringify(defaultJson)));
const activeProfileIndex = ref(0);
const clipboard = ref(null);

const activeProfile = computed(() => fanProfile.arrProfile[activeProfileIndex.value]);

const copyPolicy = (policy) => {
  clipboard.value = JSON.parse(JSON.stringify(policy));
};

const pastePolicy = (index) => {
  if (clipboard.value) {
    activeProfile.value.arrPolicy[index] = JSON.parse(JSON.stringify(clipboard.value));
  }
};

const applyCurveToAll = (sourcePolicy) => {
  if (confirm('確定要將此曲線應用到當前 Profile 的所有策略嗎？')) {
    activeProfile.value.arrPolicy.forEach(p => {
      p.arrRef = JSON.parse(JSON.stringify(sourcePolicy.arrRef));
      p.arrDuty = JSON.parse(JSON.stringify(sourcePolicy.arrDuty));
    });
  }
};

const sortPolicyPoints = (policy) => {
  const points = policy.arrRef.map((ref, i) => ({ ref, duty: policy.arrDuty[i] }));
  points.sort((a, b) => a.ref - b.ref);
  policy.arrRef = points.map(p => p.ref);
  policy.arrDuty = points.map(p => p.duty);
};

const addPoint = (policy) => {
  const lastRef = policy.arrRef[policy.arrRef.length - 1] || 50;
  const lastDuty = policy.arrDuty[policy.arrDuty.length - 1] || 50;
  policy.arrRef.push(Math.min(100, lastRef + 5));
  policy.arrDuty.push(Math.min(100, lastDuty + 10));
  sortPolicyPoints(policy);
};

const removePoint = (policy, index) => {
  if (policy.arrRef.length <= 1) return;
  policy.arrRef.splice(index, 1);
  policy.arrDuty.splice(index, 1);
};

// Draggable Chart Logic
const draggingPoint = ref(null); // { pIdx, ptIdx }

const startDrag = (pIdx, ptIdx) => {
  draggingPoint.value = { pIdx, ptIdx };
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
};

const onDrag = (e) => {
  if (!draggingPoint.value) return;
  const { pIdx, ptIdx } = draggingPoint.value;
  const policy = activeProfile.value.arrPolicy[pIdx];
  
  const svg = document.getElementById(`svg-chart-${pIdx}`);
  if (!svg) return;
  
  const rect = svg.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Map SVG coordinates (0-200, 0-100) to (0-100 temp, 0-100 duty)
  // Temp: 0-100 -> 0-200px
  // Duty: 0-100 -> 100-0px (inverted)
  let newTemp = Math.round((x / rect.width) * 100);
  let newDuty = Math.round(100 - (y / rect.height) * 100);
  
  newTemp = Math.max(0, Math.min(100, newTemp));
  newDuty = Math.max(0, Math.min(100, newDuty));
  
  policy.arrRef[ptIdx] = newTemp;
  policy.arrDuty[ptIdx] = newDuty;
  
  // Optional: Keep sorted while dragging or sort on stop
};

const stopDrag = () => {
  if (draggingPoint.value) {
    sortPolicyPoints(activeProfile.value.arrPolicy[draggingPoint.value.pIdx]);
  }
  draggingPoint.value = null;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
};

const getSvgPath = (policy) => {
  if (!policy.arrRef.length) return '';
  const points = policy.arrRef.map((ref, i) => ({
    x: ref * 2, // 0-100 -> 0-200
    y: 100 - policy.arrDuty[i] // 0-100 -> 100-0
  }));
  
  let path = `M 0 ${points[0].y} L ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  path += ` L 200 ${points[points.length - 1].y}`;
  return path;
};

const addPolicy = () => {
  activeProfile.value.arrPolicy.push({
    "arrRef": [50, 80],
    "iSensorCode": 1,
    "arrHexDeviceID": [],
    "iInSDR": 1,
    "arrDuty": [20, 100],
    "iCpuTdp": 0,
    "iInitDuty": 20,
    "arrHexVendorID": [],
    "iAmbientSensorTemp": 0,
    "arrSensor": [],
    "arrFanSensor": [160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175],
    "iPolicyType": 2,
    "iPCIEDeviceEnable": 0,
    "iAmbientSensor": 0
  });
};

const removePolicy = (index) => {
  activeProfile.value.arrPolicy.splice(index, 1);
};

const addProfile = () => {
  const name = prompt('請輸入新 Profile 名稱:');
  if (name) {
    fanProfile.arrProfile.push({
      "strVersion": "1.00",
      "strName": name,
      "arrPolicy": JSON.parse(JSON.stringify(activeProfile.value.arrPolicy))
    });
    activeProfileIndex.value = fanProfile.arrProfile.length - 1;
  }
};

const removeProfile = () => {
  if (fanProfile.arrProfile.length <= 1) {
    alert('至少需要保留一個 Profile');
    return;
  }
  if (confirm(`確定要刪除 Profile "${activeProfile.value.strName}" 嗎？`)) {
    fanProfile.arrProfile.splice(activeProfileIndex.value, 1);
    activeProfileIndex.value = 0;
  }
};

const exportJson = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fanProfile, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "fanprofile.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

const importJson = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      if (json.arrProfile && Array.isArray(json.arrProfile)) {
        Object.assign(fanProfile, json);
        activeProfileIndex.value = 0;
      } else {
        alert('無效的 fanprofile.json 格式');
      }
    } catch (err) {
      alert('解析 JSON 失敗: ' + err.message);
    }
  };
  reader.readAsText(file);
};

const triggerFileInput = () => {
  document.getElementById('fan-import-input').click();
};

const copyJson = () => {
  navigator.clipboard.writeText(JSON.stringify(fanProfile, null, 2));
  alert('JSON 已複製到剪貼簿');
};

const resetToDefault = () => {
  if (confirm('確定要重置所有設定嗎？這將清除所有自訂 Profile。')) {
    Object.assign(fanProfile, JSON.parse(JSON.stringify(defaultJson)));
    activeProfileIndex.value = 0;
  }
};

const updateArray = (obj, key, value) => {
  if (typeof value === 'string') {
    obj[key] = value.split(/[\s,]+/).map(v => isNaN(v) ? v : Number(v)).filter(v => typeof v === 'number');
  }
};

const toggleIdInArray = (arr, id) => {
  const index = arr.indexOf(id);
  if (index === -1) {
    arr.push(id);
    arr.sort((a, b) => a - b);
  } else {
    arr.splice(index, 1);
  }
};

const commonSensors = [1, 2, 4, 5, 6, 7, 14, 15, 16, 17, 28, 29, 30, 32, 33, 36, 39, 48, 49, 56, 57, 72, 74, 76, 78, 79, 86];
const commonFans = Array.from({ length: 16 }, (_, i) => 160 + i);
</script>

<template>
  <div class="fan-builder">
    <div class="info-banner">
      <span class="icon">🌬️</span>
      <span>Gigabyte 伺服器風扇策略編輯器。您可以調整不同 Profile 下的溫度與轉速對應關係。</span>
    </div>

    <div class="config-section">
      <div class="section-header">
        <div class="title-group">
          <span class="section-title">📋 Profile 管理</span>
          <select v-model="fanProfile.strMode" class="mode-select" title="當前啟動模式">
            <option v-for="p in fanProfile.arrProfile" :key="p.strName" :value="p.strName">{{ p.strName }} (啟動中)</option>
          </select>
        </div>
        <div class="actions">
          <button class="btn-secondary" @click="addProfile">+ 新增 Profile</button>
          <button class="btn-danger" @click="removeProfile" :disabled="fanProfile.arrProfile.length <= 1">刪除當前 Profile</button>
        </div>
      </div>

      <div class="profile-tabs">
        <button 
          v-for="(p, index) in fanProfile.arrProfile" 
          :key="index"
          :class="['tab-btn', { active: activeProfileIndex === index }]"
          @click="activeProfileIndex = index"
        >
          {{ p.strName }}
        </button>
      </div>

      <div v-if="activeProfile" class="policy-editor">
        <div class="section-header">
          <span class="section-title">🛠️ 策略列表 ({{ activeProfile.arrPolicy.length }})</span>
          <button class="btn-primary" @click="addPolicy">+ 新增策略</button>
        </div>

        <div class="policy-list">
          <div v-for="(policy, pIdx) in activeProfile.arrPolicy" :key="pIdx" class="policy-card">
            <div class="policy-header">
              <div class="policy-title-row">
                <span class="policy-title">策略 #{{ pIdx + 1 }}</span>
                <div class="policy-actions">
                  <button class="btn-small" @click="copyPolicy(policy)">📋 複製</button>
                  <button class="btn-small" @click="pastePolicy(pIdx)" :disabled="!clipboard">📥 貼上</button>
                  <button class="btn-small" @click="applyCurveToAll(policy)" title="將此曲線套用到所有策略">🔄 套用曲線至全部</button>
                </div>
              </div>
              <button class="btn-icon-danger" @click="removePolicy(pIdx)" title="刪除策略">×</button>
            </div>
            
            <div class="policy-content-layout">
              <div class="chart-container">
                <div class="chart-header">
                  <span>📈 風扇曲線 (拖動點調整)</span>
                  <button class="btn-small" @click="addPoint(policy)">+ 新增點</button>
                </div>
                <svg 
                  :id="`svg-chart-${pIdx}`"
                  viewBox="0 0 200 100" 
                  class="fan-chart"
                  @mousedown.prevent
                >
                  <!-- Grid lines -->
                  <line x1="0" y1="25" x2="200" y2="25" stroke="#30363d" stroke-width="0.5" />
                  <line x1="0" y1="50" x2="200" y2="50" stroke="#30363d" stroke-width="0.5" />
                  <line x1="0" y1="75" x2="200" y2="75" stroke="#30363d" stroke-width="0.5" />
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#30363d" stroke-width="0.5" />
                  <line x1="100" y1="0" x2="100" y2="100" stroke="#30363d" stroke-width="0.5" />
                  <line x1="150" y1="0" x2="150" y2="100" stroke="#30363d" stroke-width="0.5" />
                  
                  <!-- Curve -->
                  <path :d="getSvgPath(policy)" fill="none" stroke="#58a6ff" stroke-width="2" />
                  
                  <!-- Points -->
                  <circle 
                    v-for="(ref, ptIdx) in policy.arrRef" 
                    :key="ptIdx"
                    :cx="ref * 2" 
                    :cy="100 - policy.arrDuty[ptIdx]" 
                    r="4" 
                    class="chart-point"
                    @mousedown="startDrag(pIdx, ptIdx)"
                    @contextmenu.prevent="removePoint(policy, ptIdx)"
                  >
                    <title>溫度: {{ ref }}°C, 轉速: {{ policy.arrDuty[ptIdx] }}% (右鍵刪除)</title>
                  </circle>
                </svg>
                <div class="chart-labels">
                  <span>0°C</span>
                  <span>50°C</span>
                  <span>100°C</span>
                </div>
              </div>

              <div class="fields-container">
                <div class="config-grid">
                  <div class="form-group">
                    <label>溫度參考點 (arrRef)</label>
                    <div class="array-input-group">
                      <input 
                        type="text" 
                        :value="policy.arrRef.join(', ')" 
                        @input="e => updateArray(policy, 'arrRef', e.target.value)"
                        placeholder="例如: 55, 88"
                      />
                      <button class="btn-icon" @click="sortPolicyPoints(policy)" title="自動排序">↕</button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>風扇佔空比 (arrDuty %)</label>
                    <input 
                      type="text" 
                      :value="policy.arrDuty.join(', ')" 
                      @input="e => updateArray(policy, 'arrDuty', e.target.value)"
                      placeholder="例如: 30, 100"
                    />
                  </div>
                </div>

                <div class="config-grid">
                  <div class="form-group">
                    <label>初始佔空比 (iInitDuty %)</label>
                    <input type="number" v-model.number="policy.iInitDuty" min="0" max="100" />
                  </div>
                  <div class="form-group">
                    <label>滯後溫度 (iHysteresis)</label>
                    <input type="number" v-model.number="policy.iHysteresis" min="0" />
                  </div>
                </div>
              </div>
            </div>

            <div class="config-grid" style="margin-top: 12px;">
              <div class="form-group">
                <label>感測器 ID 列表 (arrSensor)</label>
                <div class="id-selector-container">
                  <textarea 
                    rows="1"
                    :value="policy.arrSensor.join(', ')" 
                    @input="e => updateArray(policy, 'arrSensor', e.target.value)"
                    placeholder="例如: 1, 2, 3"
                  ></textarea>
                  <div class="quick-ids">
                    <span 
                      v-for="id in commonSensors" 
                      :key="id"
                      :class="['id-chip', { active: policy.arrSensor.includes(id) }]"
                      @click="toggleIdInArray(policy.arrSensor, id)"
                    >
                      {{ id }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>受控風扇 ID 列表 (arrFanSensor)</label>
                <div class="id-selector-container">
                  <textarea 
                    rows="1"
                    :value="policy.arrFanSensor.join(', ')" 
                    @input="e => updateArray(policy, 'arrFanSensor', e.target.value)"
                    placeholder="例如: 160, 161, 162"
                  ></textarea>
                  <div class="quick-ids">
                    <span 
                      v-for="id in commonFans" 
                      :key="id"
                      :class="['id-chip', { active: policy.arrFanSensor.includes(id) }]"
                      @click="toggleIdInArray(policy.arrFanSensor, id)"
                    >
                      {{ id }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="advanced-toggle" @click="policy.showAdvanced = !policy.showAdvanced">
              {{ policy.showAdvanced ? '▼ 隱藏進階參數' : '▶ 顯示進階參數' }}
            </div>

            <div v-if="policy.showAdvanced" class="config-grid advanced-fields">
              <div class="form-group">
                <label>iSensorCode</label>
                <input type="number" v-model.number="policy.iSensorCode" />
              </div>
              <div class="form-group">
                <label>iInSDR</label>
                <input type="number" v-model.number="policy.iInSDR" />
              </div>
              <div class="form-group">
                <label>iPolicyType</label>
                <input type="number" v-model.number="policy.iPolicyType" />
              </div>
              <div class="form-group">
                <label>iPCIEDeviceEnable</label>
                <input type="number" v-model.number="policy.iPCIEDeviceEnable" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="result-section">
      <div class="section-header">
        <span class="section-title">📄 JSON 預覽與匯出</span>
        <div class="actions">
          <button class="btn-danger" @click="resetToDefault">⚠️ 重置全部</button>
          <button class="btn-secondary" @click="triggerFileInput">📥 匯入 JSON</button>
          <button class="btn-secondary" @click="copyJson">📋 複製 JSON</button>
          <button class="btn-primary" @click="exportJson">📤 匯出 fanprofile.json</button>
          <input 
            type="file" 
            id="fan-import-input" 
            style="display: none" 
            accept=".json" 
            @change="importJson" 
          />
        </div>
      </div>
      <pre class="json-preview">{{ JSON.stringify(fanProfile, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.fan-builder {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-banner {
  background: rgba(56, 139, 253, 0.1);
  border: 1px solid rgba(56, 139, 253, 0.2);
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #e6edf3;
}

.mode-select {
  background: #161b22;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.profile-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #30363d;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 1px;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  color: #8b949e;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #e6edf3;
  background: #21262d;
}

.tab-btn.active {
  color: #58a6ff;
  border-color: #30363d;
  background: #0d1117;
  position: relative;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #58a6ff;
}

.policy-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.policy-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
}

.policy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid #21262d;
  padding-bottom: 8px;
}

.policy-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.policy-actions {
  display: flex;
  gap: 4px;
}

.policy-content-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 600px) {
  .policy-content-layout {
    grid-template-columns: 1fr;
  }
}

.chart-container {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #8b949e;
  margin-bottom: 8px;
}

.fan-chart {
  width: 100%;
  height: 120px;
  background: #0d1117;
  cursor: crosshair;
}

.chart-point {
  fill: #58a6ff;
  cursor: grab;
  transition: r 0.2s;
}

.chart-point:hover {
  r: 6;
  fill: #79c0ff;
}

.chart-point:active {
  cursor: grabbing;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: #484f58;
  margin-top: 4px;
}

.array-input-group {
  display: flex;
  gap: 4px;
}

.array-input-group input {
  flex: 1;
}

.btn-icon {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  width: 32px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-small {
  font-size: 0.7rem;
  padding: 2px 6px;
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  border-radius: 4px;
  cursor: pointer;
}

.btn-small:hover:not(:disabled) {
  background: #30363d;
  color: #fff;
}

.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.id-selector-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-ids {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 60px;
  overflow-y: auto;
  padding: 4px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
}

.id-chip {
  font-size: 0.65rem;
  padding: 1px 4px;
  background: #21262d;
  border: 1px solid #30363d;
  color: #8b949e;
  border-radius: 3px;
  cursor: pointer;
  user-select: none;
}

.id-chip:hover {
  border-color: #8b949e;
  color: #c9d1d9;
}

.id-chip.active {
  background: #1f6feb;
  border-color: #58a6ff;
  color: #fff;
}

.policy-title {
  font-weight: 600;
  color: #8b949e;
}

.btn-icon-danger {
  background: transparent;
  border: none;
  color: #f85149;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.btn-icon-danger:hover {
  color: #ff7b72;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.85rem;
  color: #8b949e;
}

.form-group input, .form-group textarea {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 8px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.form-group input:focus, .form-group textarea:focus {
  border-color: #58a6ff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1);
}

.advanced-toggle {
  font-size: 0.8rem;
  color: #58a6ff;
  cursor: pointer;
  margin-top: 8px;
  user-select: none;
}

.advanced-fields {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #30363d;
}

.json-preview {
  background: #0d1117;
  border: 1px solid #30363d;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: #7ee787;
  max-height: 400px;
  overflow-y: auto;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-primary {
  background: #238636;
  color: white;
  border: 1px solid rgba(240, 246, 252, 0.1);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
}

.btn-primary:hover {
  background: #2ea043;
}

.btn-secondary {
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-secondary:hover {
  background: #30363d;
  border-color: #8b949e;
}

.btn-danger {
  background: transparent;
  color: #f85149;
  border: 1px solid #30363d;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-danger:hover:not(:disabled) {
  background: #f85149;
  color: white;
  border-color: #f85149;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.muted {
  font-size: 0.75rem;
  color: #8b949e;
}
</style>
