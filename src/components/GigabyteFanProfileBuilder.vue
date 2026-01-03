<script setup>
import { ref, reactive, watch, computed, onMounted, defineComponent, h } from 'vue';
import { parseGigabyteXml, parseGigabyteTopo, fetchModelList, fetchModelXml } from '../utils/gigabyte_xml';

// Recursive component for Topo Tree (Block Diagram Style)
const TopoNode = defineComponent({
  name: 'TopoNode',
  props: ['node', 'depth', 'searchQuery'],
  setup(props) {
    const isOpen = ref((props.depth || 0) < 2);
    const hasChildren = computed(() => props.node.children && props.node.children.length > 0);
    
    const matchesSearch = computed(() => {
      if (!props.searchQuery) return true;
      const q = props.searchQuery.toLowerCase();
      const nameMatch = props.node.name.toLowerCase().includes(q);
      const attrMatch = Object.values(props.node.attributes || {}).some(v => String(v).toLowerCase().includes(q));
      const childrenMatch = props.node.children?.some(c => {
        const check = (n) => {
          if (n.name.toLowerCase().includes(q)) return true;
          if (Object.values(n.attributes || {}).some(v => String(v).toLowerCase().includes(q))) return true;
          return n.children?.some(check);
        };
        return check(c);
      });
      return nameMatch || attrMatch || childrenMatch;
    });

    const getIcon = (name) => {
      const n = name.toUpperCase();
      if (n.includes('SENSOR')) return '🌡️';
      if (n.includes('FAN')) return '🌬️';
      if (n.includes('I2C')) return '🔌';
      if (n.includes('GPU')) return '🎮';
      if (n.includes('CPU')) return '🧠';
      if (n.includes('DIMM')) return '💾';
      if (n.includes('PCA')) return '🔀';
      if (n.includes('BUS')) return '🚌';
      if (n.includes('TEMP')) return '🔥';
      return '📦';
    };

    const getNodeClass = (name) => {
      const n = name.toUpperCase();
      if (n.includes('I2C') || n.includes('BUS')) return 'node-bus';
      if (n.includes('SENSOR') || n.includes('TEMP')) return 'node-sensor';
      if (n.includes('FAN')) return 'node-fan';
      if (n.includes('GPU') || n.includes('CPU')) return 'node-compute';
      return 'node-default';
    };

    const highlightText = (text, query) => {
      if (!query) return text;
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return parts.map(part => 
        part.toLowerCase() === query.toLowerCase() 
          ? h('span', { class: 'search-highlight' }, part) 
          : part
      );
    };

    return () => {
      if (!matchesSearch.value) return null;

      return h('div', { 
        class: ['topo-block', getNodeClass(props.node.name), { 'is-open': isOpen.value, 'has-children': hasChildren.value }],
      }, [
        h('div', { 
          class: 'topo-header', 
          onClick: (e) => { e.stopPropagation(); isOpen.value = !isOpen.value; } 
        }, [
          h('div', { class: 'topo-header-main' }, [
            h('span', { class: 'topo-icon' }, getIcon(props.node.name)),
            h('span', { class: 'topo-name' }, highlightText(props.node.name, props.searchQuery)),
            hasChildren.value ? h('span', { class: 'topo-count' }, props.node.children.length) : null,
          ]),
          h('div', { class: 'topo-attrs' }, 
            Object.entries(props.node.attributes || {}).map(([key, val]) => 
              h('span', { class: 'topo-attr-pill', key }, [
                h('span', { class: 'topo-attr-k' }, key),
                h('span', { class: 'topo-attr-v' }, highlightText(String(val), props.searchQuery))
              ])
            )
          ),
          hasChildren.value ? h('span', { class: 'topo-toggle' }, isOpen.value ? '−' : '+') : null
        ]),
        (isOpen.value && hasChildren.value) ? h('div', { class: 'topo-children' }, 
          props.node.children.map((child, idx) => 
            h(TopoNode, { 
              key: idx, 
              node: child, 
              depth: (props.depth || 0) + 1,
              searchQuery: props.searchQuery
            })
          )
        ) : null
      ]);
    };
  }
});

const defaultJson = {"strVersion":"1.00","arrProfile":[{"strVersion":"1.00","strName":"default","arrPolicy":[{"arrRef":[55,88],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[30,100],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[1,2],"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[25,100],"iCpuTdp":0,"iInitDuty":25,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[4,5],"arrFanSensor":[160,161,166,167],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[25,100],"iCpuTdp":0,"iInitDuty":25,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[6,7],"arrFanSensor":[168,169,174,175],"iHysteresis":0,"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,68],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[25,100],"iCpuTdp":0,"iInitDuty":25,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[28,29,30],"arrFanSensor":[162,163,164,165,166,167,168,169,170,171,172,173],"iHysteresis":0,"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[55,66],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[30,100],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[56,57],"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrDuty":[30,100],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrRef":[55,85],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[36,39],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"arrDuty":[30,100],"iSensorCode":1,"iInSDR":1,"arrRef":[50,85],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[32,33],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"arrDuty":[30,100],"iSensorCode":1,"iInSDR":1,"arrRef":[60,88],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[48,49],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"iPCIEDeviceEnable":0,"arrRef":[50,85],"iSensorCode":1,"iInSDR":1,"arrDuty":[30,100],"iCpuTdp":0,"iInitDuty":30,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[14,15,76,78,79],"arrFanSensor":[160,161,162,163,164,165,166,167],"iHysteresis":0,"iPolicyType":2,"arrHexDeviceID":[],"iAmbientSensor":0},{"iPolicyType":2,"iInSDR":1,"iSensorCode":1,"iInitDuty":30,"iCpuTdp":0,"iAmbientSensor":0,"iAmbientSensorTemp":0,"arrSensor":[16,17,72,74,86],"arrFanSensor":[168,169,170,171,172,173,174,175],"arrRef":[50,85],"arrDuty":[30,100],"arrHexVendorID":[],"arrHexDeviceID":[],"iPCIEDeviceEnable":0,"iHysteresis":0}]},{"strVersion":"1.00","strName":"SPECpower","arrPolicy":[{"arrRef":[60,88],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[1,2],"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[4,5],"arrFanSensor":[160,161,166,167],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[6,7],"arrFanSensor":[168,169,174,175],"iHysteresis":0,"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[50,68],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[28,29,30],"arrFanSensor":[162,163,164,165,166,167,168,169,170,171,172,173],"iHysteresis":0,"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[55,66],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[56,57],"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrDuty":[15,100],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrRef":[55,85],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[36,39],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"arrDuty":[15,100],"iSensorCode":1,"iInSDR":1,"arrRef":[50,85],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[32,33],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"arrDuty":[15,100],"iSensorCode":1,"iInSDR":1,"arrRef":[60,88],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[48,49],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"iPCIEDeviceEnable":0,"arrRef":[50,85],"iSensorCode":1,"iInSDR":1,"arrDuty":[15,100],"iCpuTdp":0,"iInitDuty":15,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[14,15,76,78,79],"arrFanSensor":[160,161,162,163,164,165,166,167],"iHysteresis":0,"iPolicyType":2,"arrHexDeviceID":[],"iAmbientSensor":0},{"iPolicyType":2,"iInSDR":1,"iSensorCode":1,"iInitDuty":15,"iCpuTdp":0,"iAmbientSensor":0,"iAmbientSensorTemp":0,"arrSensor":[16,17,72,74,86],"arrFanSensor":[168,169,170,171,172,173,174,175],"arrRef":[55,85],"arrDuty":[15,100],"arrHexVendorID":[],"arrHexDeviceID":[],"iPCIEDeviceEnable":0,"iHysteresis":0}]},{"strVersion":"1.00","strName":"isc","arrPolicy":[{"arrRef":[75,88],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[10,100],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[1,2],"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[60,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[10,100],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[4,5],"arrFanSensor":[160,161,166,167],"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrRef":[60,80],"iSensorCode":1,"arrHexDeviceID":[],"iInSDR":1,"arrDuty":[10,100],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[6,7],"arrFanSensor":[168,169,174,175],"iHysteresis":0,"iPolicyType":2,"iPCIEDeviceEnable":0,"iAmbientSensor":0},{"arrDuty":[10,25,100],"iSensorCode":1,"iInSDR":1,"arrRef":[75,83,85],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[32,33],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"arrDuty":[10,100],"iSensorCode":1,"iInSDR":1,"arrRef":[60,88],"arrHexDeviceID":[],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[48,49],"iPCIEDeviceEnable":0,"iHysteresis":0,"iPolicyType":2,"arrFanSensor":[160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],"iAmbientSensor":0},{"iPCIEDeviceEnable":0,"arrRef":[60,85],"iSensorCode":1,"iInSDR":1,"arrDuty":[10,100],"iCpuTdp":0,"iInitDuty":10,"arrHexVendorID":[],"iAmbientSensorTemp":0,"arrSensor":[14,15,76,78,79],"arrFanSensor":[160,161,162,163,164,165,166,167],"iHysteresis":0,"iPolicyType":2,"arrHexDeviceID":[],"iAmbientSensor":0},{"iPolicyType":2,"iInSDR":1,"iSensorCode":1,"iInitDuty":10,"iCpuTdp":0,"iAmbientSensor":0,"iAmbientSensorTemp":0,"arrSensor":[16,17,72,74,86],"arrFanSensor":[168,169,170,171,172,173,174,175],"arrRef":[60,85],"arrDuty":[10,100],"arrHexVendorID":[],"arrHexDeviceID":[],"iPCIEDeviceEnable":0,"iHysteresis":0}]}],"strMode":"isc"};

const fanProfile = reactive(JSON.parse(JSON.stringify(defaultJson)));
const activeProfileIndex = ref(0);
const clipboard = ref(null);

// Hardware Mapping State
const models = ref([]);
const selectedModel = ref(null);
const currentHardwareModel = ref("未選擇型號");
const hardwareMap = reactive({ sensors: {}, fans: {} });
const topoData = ref(null);
const activeMainTab = ref('editor'); // 'editor' or 'topo'

onMounted(async () => {
  models.value = await fetchModelList();
  if (models.value.length > 0) {
    selectedModel.value = models.value[0];
  }
});

watch(selectedModel, async (newModel) => {
  if (newModel) {
    const xml = await fetchModelXml(newModel.file);
    if (xml) {
      const result = parseGigabyteXml(xml);
      hardwareMap.sensors = result.sensors;
      hardwareMap.fans = result.fans;
      topoData.value = parseGigabyteTopo(xml);
      currentHardwareModel.value = newModel.name;
    }
  }
});

const getSensorName = (id) => hardwareMap.sensors[id] || `未知感測器 (${id})`;
const getFanName = (id) => hardwareMap.fans[id] || `未知風扇 (${id})`;

const importXml = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const xml = e.target.result;
      const result = parseGigabyteXml(xml);
      hardwareMap.sensors = result.sensors;
      hardwareMap.fans = result.fans;
      topoData.value = parseGigabyteTopo(xml);
      currentHardwareModel.value = "Custom (Imported)";
      selectedModel.value = null;
      alert('XML 解析成功！已更新感測器與風扇對照表。');
    } catch (err) {
      alert('解析 XML 失敗: ' + err.message);
    }
  };
  reader.readAsText(file);
};

const triggerXmlInput = () => {
  document.getElementById('xml-import-input').click();
};

const refreshTopo = async () => {
  if (selectedModel.value) {
    const xml = await fetchModelXml(selectedModel.value.file);
    if (xml) {
      topoData.value = parseGigabyteTopo(xml);
    }
  } else {
    alert('請先選擇一個型號或匯入 XML');
  }
};

const activeProfile = computed(() => fanProfile.arrProfile[activeProfileIndex.value]);
const isDefaultProfile = computed(() => activeProfile.value?.strName === 'default');

// UI State
const sensorSearch = ref('');
const fanSearch = ref('');
const topoSearch = ref('');

const filteredSensors = computed(() => {
  const allSensors = Object.keys(hardwareMap.sensors).map(Number);
  if (!sensorSearch.value) return allSensors;
  const search = sensorSearch.value.toLowerCase();
  return allSensors.filter(id => {
    const name = getSensorName(id).toLowerCase();
    return name.includes(search) || id.toString().includes(search);
  });
});

const filteredFans = computed(() => {
  const allFans = Object.keys(hardwareMap.fans).map(Number);
  if (!fanSearch.value) return allFans;
  const search = fanSearch.value.toLowerCase();
  return allFans.filter(id => {
    const name = getFanName(id).toLowerCase();
    return name.includes(search) || id.toString().includes(search);
  });
});

const sensorGroups = computed(() => {
  const groups = { 'CPU': [], 'SYS': [], 'GPU': [], 'Other': [] };
  const allSensors = Object.keys(hardwareMap.sensors).map(Number);
  allSensors.forEach(id => {
    const name = getSensorName(id).toUpperCase();
    if (name.includes('CPU')) groups['CPU'].push(id);
    else if (name.includes('SYS')) groups['SYS'].push(id);
    else if (name.includes('GPU') || name.includes('SLOT')) groups['GPU'].push(id);
    else groups['Other'].push(id);
  });
  return groups;
});

const applyPreset = (policy, type) => {
  if (isDefaultProfile.value) return;
  if (type === 'quiet') {
    policy.arrRef = [40, 70];
    policy.arrDuty = [20, 60];
  } else if (type === 'standard') {
    policy.arrRef = [50, 80];
    policy.arrDuty = [30, 100];
  } else if (type === 'performance') {
    policy.arrRef = [45, 75];
    policy.arrDuty = [50, 100];
  }
  sortPolicyPoints(policy);
};

const copyPolicy = (policy) => {
  clipboard.value = JSON.parse(JSON.stringify(policy));
};

const pastePolicy = (index) => {
  if (isDefaultProfile.value || !clipboard.value) return;
  activeProfile.value.arrPolicy[index] = JSON.parse(JSON.stringify(clipboard.value));
};

const applyCurveToAll = (sourcePolicy) => {
  if (isDefaultProfile.value) return;
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
  if (isDefaultProfile.value) return;
  const lastRef = policy.arrRef[policy.arrRef.length - 1] || 50;
  const lastDuty = policy.arrDuty[policy.arrDuty.length - 1] || 50;
  policy.arrRef.push(Math.min(100, lastRef + 5));
  policy.arrDuty.push(Math.min(100, lastDuty + 10));
  sortPolicyPoints(policy);
};

const removePoint = (policy, index) => {
  if (isDefaultProfile.value || policy.arrRef.length <= 1) return;
  policy.arrRef.splice(index, 1);
  policy.arrDuty.splice(index, 1);
};

// Draggable Chart Logic
const draggingPoint = ref(null); // { pIdx, ptIdx }

const startDrag = (pIdx, ptIdx) => {
  if (isDefaultProfile.value) return;
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
  if (isDefaultProfile.value) return;
  activeProfile.value.arrPolicy.push({
    "isCollapsed": false,
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
  if (isDefaultProfile.value) return;
  activeProfile.value.arrPolicy.splice(index, 1);
};

const addProfile = () => {
  const name = prompt('請輸入新 Profile 名稱:');
  if (name) {
    fanProfile.arrProfile.push({
      "strVersion": "1.00",
      "strName": name,
      "arrPolicy": []
    });
    activeProfileIndex.value = fanProfile.arrProfile.length - 1;
  }
};

const duplicateProfile = () => {
  const name = prompt('請輸入新 Profile 名稱:', activeProfile.value.strName + '_copy');
  if (name) {
    fanProfile.arrProfile.push({
      ...JSON.parse(JSON.stringify(activeProfile.value)),
      strName: name
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

const showJsonPreview = ref(false);

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
  if (isDefaultProfile.value) return;
  if (typeof value === 'string') {
    obj[key] = value.split(/[\s,]+/).map(v => isNaN(v) ? v : Number(v)).filter(v => typeof v === 'number');
  }
};

const toggleIdInArray = (arr, id) => {
  if (isDefaultProfile.value) return;
  const index = arr.indexOf(id);
  if (index === -1) {
    arr.push(id);
    arr.sort((a, b) => a - b);
  } else {
    arr.splice(index, 1);
  }
};
</script>

<template>
  <div class="fan-builder">
    <div class="info-banner">
      <span class="icon">🌬️</span>
      <span>Gigabyte 伺服器風扇策略編輯器。您可以調整不同 Profile 下的溫度與轉速對應關係。</span>
    </div>

    <!-- Main Tabs -->
    <div class="main-tabs">
      <button 
        :class="['main-tab-btn', { active: activeMainTab === 'editor' }]"
        @click="activeMainTab = 'editor'"
      >
        🎨 策略編輯器
      </button>
      <button 
        :class="['main-tab-btn', { active: activeMainTab === 'topo' }]"
        @click="activeMainTab = 'topo'"
      >
        🌿 硬體拓樸檢視
      </button>
    </div>

    <!-- Top Management Section -->
    <div v-if="activeMainTab === 'editor'" class="management-section">
      <div class="mgmt-card">
        <div class="mgmt-group">
          <div class="mgmt-header">
            <span class="mgmt-icon">🔧</span>
            <span class="mgmt-label">硬體配置 (BMC XML)</span>
          </div>
          <div class="mgmt-controls">
            <select v-model="selectedModel" class="mode-select model-dropdown">
              <option :value="null" disabled>-- 選擇伺服器機型 --</option>
              <option v-for="m in models" :key="m.id" :value="m">{{ m.name }} ({{ m.id }})</option>
            </select>
            <button class="btn-secondary" @click="triggerXmlInput" title="匯入自訂 XML">📥 匯入 XML</button>
            <input type="file" id="xml-import-input" @change="importXml" accept=".xml" style="display: none" />
            <span class="model-tag" v-if="currentHardwareModel">
              {{ currentHardwareModel }}
            </span>
          </div>
        </div>

        <div class="mgmt-divider"></div>

        <div class="mgmt-group">
          <div class="mgmt-header">
            <span class="mgmt-icon">💾</span>
            <span class="mgmt-label">設定檔 (JSON)</span>
          </div>
          <div class="mgmt-controls">
            <button class="btn-secondary" @click="triggerFileInput">📥 匯入 JSON</button>
            <button class="btn-primary" @click="exportJson">📤 匯出 JSON</button>
            <button class="btn-secondary" @click="copyJson">📋 複製</button>
            <button class="btn-danger-outline" @click="resetToDefault">⚠️ 重置</button>
            <input type="file" id="fan-import-input" style="display: none" accept=".json" @change="importJson" />
          </div>
        </div>
      </div>
    </div>

    <!-- Topo Viewer Section -->
    <div v-if="activeMainTab === 'topo'" class="topo-section">
      <div class="section-header">
        <div class="title-group">
          <span class="section-title">🖥️ 硬體架構圖 (Hardware Topology)</span>
          <span class="model-tag">{{ currentHardwareModel }}</span>
        </div>
        <div class="actions">
          <div class="search-wrapper">
            <input 
              type="text" 
              v-model="topoSearch" 
              placeholder="搜尋元件或屬性..." 
              class="search-input"
            />
            <span v-if="topoSearch" class="search-clear" @click="topoSearch = ''">×</span>
          </div>
          <button class="btn-secondary" @click="refreshTopo">🔄 重新整理</button>
          <button class="btn-secondary" @click="triggerXmlInput">📥 更換 XML</button>
        </div>
      </div>

      <div class="topo-container">
        <div v-if="topoData" class="topo-graph-view">
          <TopoNode :node="topoData" :searchQuery="topoSearch" />
        </div>
        <div v-else class="empty-state">
          <div class="loading-spinner"></div>
          <span>載入中或無資料...</span>
        </div>
      </div>
    </div>

    <div v-if="activeMainTab === 'editor'" class="config-section">
      <div class="section-header">
        <div class="title-group">
          <span class="section-title">📋 Profile 管理</span>
          <div class="mode-indicator">
            <label>當前啟動模式:</label>
            <select v-model="fanProfile.strMode" class="mode-select-small">
              <option v-for="p in fanProfile.arrProfile" :key="p.strName" :value="p.strName">{{ p.strName }}</option>
            </select>
          </div>
        </div>
        <div class="actions">
          <button class="btn-secondary" @click="addProfile">+ 新增 Profile</button>
          <button class="btn-secondary" @click="duplicateProfile">📋 複製當前</button>
          <button class="btn-danger" @click="removeProfile" :disabled="fanProfile.arrProfile.length <= 1">刪除當前</button>
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
          <div class="title-group">
            <span class="section-title">🛠️ 策略列表 ({{ activeProfile.arrPolicy.length }})</span>
            <span v-if="isDefaultProfile" class="readonly-badge">唯讀模式 (Default Profile 不可修改)</span>
          </div>
          <button class="btn-primary" @click="addPolicy" :disabled="isDefaultProfile">+ 新增策略</button>
        </div>

        <div class="policy-list">
          <div v-for="(policy, pIdx) in activeProfile.arrPolicy" :key="pIdx" :class="['policy-card', { collapsed: policy.isCollapsed, readonly: isDefaultProfile }]">
            <div class="policy-header">
              <div class="policy-title-row">
                <button class="collapse-btn" @click="policy.isCollapsed = !policy.isCollapsed">
                  {{ policy.isCollapsed ? '▶' : '▼' }}
                </button>
                <span class="policy-title">策略 #{{ pIdx + 1 }}</span>
                
                <div class="policy-actions" v-if="!policy.isCollapsed">
                  <button class="btn-small" @click="copyPolicy(policy)">📋 複製</button>
                  <button class="btn-small" @click="pastePolicy(pIdx)" :disabled="!clipboard || isDefaultProfile">📥 貼上</button>
                  <button class="btn-small" @click="applyCurveToAll(policy)" :disabled="isDefaultProfile" title="將此曲線套用到所有策略">🔄 套用曲線至全部</button>
                </div>
              </div>
              <div class="header-right">
                <span v-if="policy.isCollapsed" class="collapsed-info">
                  {{ policy.arrSensor.length }} 感測器 | {{ policy.arrFanSensor.length }} 風扇
                </span>
                <button class="btn-icon-danger" @click="removePolicy(pIdx)" :disabled="isDefaultProfile" title="刪除策略">×</button>
              </div>
            </div>
            
            <div v-if="!policy.isCollapsed" class="policy-content-layout">
              <div class="chart-container">
                <div class="chart-header">
                  <span>📈 風扇曲線</span>
                  <div class="chart-actions" v-if="!isDefaultProfile">
                    <button class="btn-small" @click="addPoint(policy)">+ 點</button>
                    <div class="presets">
                      <button class="btn-tiny" @click="applyPreset(policy, 'quiet')">靜音</button>
                      <button class="btn-tiny" @click="applyPreset(policy, 'standard')">標準</button>
                      <button class="btn-tiny" @click="applyPreset(policy, 'performance')">效能</button>
                    </div>
                  </div>
                </div>
                <div class="svg-wrapper">
                  <svg 
                    :id="`svg-chart-${pIdx}`"
                    viewBox="0 0 200 100" 
                    :class="['fan-chart', { readonly: isDefaultProfile }]"
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
                      :class="['chart-point', { active: draggingPoint?.pIdx === pIdx && draggingPoint?.ptIdx === ptIdx }]"
                      @mousedown="startDrag(pIdx, ptIdx)"
                      @contextmenu.prevent="removePoint(policy, ptIdx)"
                    >
                      <title>溫度: {{ ref }}°C, 轉速: {{ policy.arrDuty[ptIdx] }}% (右鍵刪除)</title>
                    </circle>
                  </svg>
                  <div v-if="draggingPoint?.pIdx === pIdx" class="drag-tooltip" :style="{ 
                    left: (policy.arrRef[draggingPoint.ptIdx] * 2) + 'px', 
                    top: (100 - policy.arrDuty[draggingPoint.ptIdx]) + 'px' 
                  }">
                    {{ policy.arrRef[draggingPoint.ptIdx] }}°C / {{ policy.arrDuty[draggingPoint.ptIdx] }}%
                  </div>
                </div>
                <div class="chart-labels">
                  <span>0°C</span>
                  <span>50°C</span>
                  <span>100°C</span>
                </div>
              </div>

              <div class="fields-container">
                <div class="config-grid">
                  <div class="form-group">
                    <div class="label-with-desc">
                      <label>溫度控制點 (°C)</label>
                      <span class="field-desc">定義轉速變化的溫度門檻</span>
                    </div>
                    <div class="array-input-group">
                      <input 
                        type="text" 
                        :value="policy.arrRef.join(', ')" 
                        @input="e => updateArray(policy, 'arrRef', e.target.value)"
                        placeholder="例如: 55, 88"
                        :disabled="isDefaultProfile"
                      />
                      <button class="btn-icon" @click="sortPolicyPoints(policy)" :disabled="isDefaultProfile" title="自動排序">↕</button>
                    </div>
                  </div>
                  <div class="form-group">
                    <div class="label-with-desc">
                      <label>風扇轉速 (%)</label>
                      <span class="field-desc">對應溫度點的輸出百分比</span>
                    </div>
                    <input 
                      type="text" 
                      :value="policy.arrDuty.join(', ')" 
                      @input="e => updateArray(policy, 'arrDuty', e.target.value)"
                      placeholder="例如: 30, 100"
                      :disabled="isDefaultProfile"
                    />
                  </div>
                </div>

                <div class="config-grid">
                  <div class="form-group">
                    <div class="label-with-desc">
                      <label>啟動轉速 (%)</label>
                      <span class="field-desc">低於最低溫度時的初始轉速</span>
                    </div>
                    <input type="number" v-model.number="policy.iInitDuty" min="0" max="100" :disabled="isDefaultProfile" />
                  </div>
                  <div class="form-group">
                    <div class="label-with-desc">
                      <label>溫度遲滯 (°C)</label>
                      <span class="field-desc">防止臨界溫度頻繁變速的緩衝</span>
                    </div>
                    <input type="number" v-model.number="policy.iHysteresis" min="0" :disabled="isDefaultProfile" />
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!policy.isCollapsed" class="config-grid" style="margin-top: 12px;">
              <div class="form-group">
                <div class="label-row">
                  <div class="label-with-desc">
                    <label>受控感測器</label>
                    <span class="field-desc">此策略參考的溫度來源</span>
                  </div>
                  <input type="text" v-model="sensorSearch" placeholder="搜尋感測器..." class="search-input-tiny" />
                </div>
                <div class="id-selector-container">
                  <div class="selected-names-box">
                    <div v-if="policy.arrSensor.length === 0" class="placeholder">未選擇感測器</div>
                    <div v-else class="selected-chips-list">
                      <span v-for="id in policy.arrSensor" :key="id" :class="['id-chip active', { readonly: isDefaultProfile }]">
                        {{ getSensorName(id) }}
                        <span v-if="!isDefaultProfile" class="remove-icon" @click.stop="toggleIdInArray(policy.arrSensor, id)">×</span>
                      </span>
                    </div>
                  </div>
                  <div class="quick-ids-grouped" v-if="!isDefaultProfile">
                    <div v-for="(ids, group) in sensorGroups" :key="group" class="id-group">
                      <span class="group-label">{{ group }}</span>
                      <div class="group-chips">
                        <span 
                          v-for="id in ids.filter(id => filteredSensors.includes(id))" 
                          :key="id"
                          :class="['id-chip', { active: policy.arrSensor.includes(id) }]"
                          @click="toggleIdInArray(policy.arrSensor, id)"
                        >
                          {{ getSensorName(id) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <div class="label-row">
                  <div class="label-with-desc">
                    <label>受控風扇</label>
                    <span class="field-desc">此策略控制的風扇對象</span>
                  </div>
                  <input type="text" v-model="fanSearch" placeholder="搜尋風扇..." class="search-input-tiny" />
                </div>
                <div class="id-selector-container">
                  <div class="selected-names-box">
                    <div v-if="policy.arrFanSensor.length === 0" class="placeholder">未選擇風扇</div>
                    <div v-else class="selected-chips-list">
                      <span v-for="id in policy.arrFanSensor" :key="id" :class="['id-chip active', { readonly: isDefaultProfile }]">
                        {{ getFanName(id) }}
                        <span v-if="!isDefaultProfile" class="remove-icon" @click.stop="toggleIdInArray(policy.arrFanSensor, id)">×</span>
                      </span>
                    </div>
                  </div>
                  <div class="quick-ids" v-if="!isDefaultProfile">
                    <span 
                      v-for="id in filteredFans" 
                      :key="id"
                      :class="['id-chip', { active: policy.arrFanSensor.includes(id) }]"
                      @click="toggleIdInArray(policy.arrFanSensor, id)"
                    >
                      {{ getFanName(id) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!policy.isCollapsed" class="advanced-toggle" @click="policy.showAdvanced = !policy.showAdvanced">
              {{ policy.showAdvanced ? '▼ 隱藏進階參數' : '▶ 顯示進階參數' }}
            </div>

            <div v-if="!policy.isCollapsed && policy.showAdvanced" class="config-grid advanced-fields">
              <div class="form-group">
                <label>原始感測器 ID (arrSensor)</label>
                <input 
                  type="text" 
                  :value="policy.arrSensor.join(', ')" 
                  @input="e => updateArray(policy, 'arrSensor', e.target.value)"
                  placeholder="例如: 1, 2, 3"
                  :disabled="isDefaultProfile"
                />
              </div>
              <div class="form-group">
                <label>原始風扇 ID (arrFanSensor)</label>
                <input 
                  type="text" 
                  :value="policy.arrFanSensor.join(', ')" 
                  @input="e => updateArray(policy, 'arrFanSensor', e.target.value)"
                  placeholder="例如: 160, 161"
                  :disabled="isDefaultProfile"
                />
              </div>
              <div class="form-group">
                <label>感測器代碼 (iSensorCode)</label>
                <input type="number" v-model.number="policy.iSensorCode" :disabled="isDefaultProfile" />
              </div>
              <div class="form-group">
                <label>SDR 索引 (iInSDR)</label>
                <input type="number" v-model.number="policy.iInSDR" :disabled="isDefaultProfile" />
              </div>
              <div class="form-group">
                <label>策略類型 (iPolicyType)</label>
                <input type="number" v-model.number="policy.iPolicyType" :disabled="isDefaultProfile" />
              </div>
              <div class="form-group">
                <label>PCIe 裝置啟用 (iPCIEDeviceEnable)</label>
                <input type="number" v-model.number="policy.iPCIEDeviceEnable" :disabled="isDefaultProfile" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="result-section">
      <div class="section-header clickable" @click="showJsonPreview = !showJsonPreview">
        <div class="title-group">
          <span class="section-title">📄 JSON 預覽</span>
          <span class="collapse-icon">{{ showJsonPreview ? '▼' : '▶' }}</span>
        </div>
      </div>
      <pre v-if="showJsonPreview" class="json-preview">{{ JSON.stringify(fanProfile, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.fan-builder {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 40px;
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

/* Main Tabs */
.main-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.main-tab-btn {
  padding: 10px 20px;
  background: #161b22;
  border: 1px solid #30363d;
  color: #8b949e;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.main-tab-btn:hover {
  background: #21262d;
  color: #e6edf3;
}

.main-tab-btn.active {
  background: #1f6feb;
  color: white;
  border-color: #388bfd;
}

/* Topo Section */
.topo-section {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 20px;
  min-height: 600px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.topo-container {
  background: #010409;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 15px;
  flex: 1;
  overflow: auto;
}

.topo-graph-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}


.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: #8b949e;
  font-style: italic;
}

.search-input {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.search-input:focus {
  border-color: #58a6ff;
  outline: none;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-clear {
  position: absolute;
  right: 8px;
  cursor: pointer;
  color: #8b949e;
  font-size: 1.2rem;
  line-height: 1;
}

.search-clear:hover {
  color: #e6edf3;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(88, 166, 255, 0.1);
  border-top-color: #58a6ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Management Section */
.management-section {
  margin-bottom: 10px;
}

.mgmt-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  gap: 30px;
  align-items: stretch;
}

.mgmt-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mgmt-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mgmt-icon {
  font-size: 1.2rem;
}

.mgmt-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e6edf3;
}

.mgmt-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.mgmt-divider {
  width: 1px;
  background: #30363d;
}

.model-dropdown {
  flex: 1;
  min-width: 200px;
}

.model-tag {
  background: rgba(88, 166, 255, 0.1);
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  border: 1px solid rgba(88, 166, 255, 0.3);
  color: #58a6ff;
  white-space: nowrap;
}

.mode-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0d1117;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid #30363d;
}

.mode-indicator label {
  font-size: 0.75rem;
  color: #8b949e;
}

.mode-select-small {
  background: transparent;
  border: none;
  color: #58a6ff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.mode-select-small:focus {
  outline: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header.clickable {
  cursor: pointer;
  user-select: none;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.section-header.clickable:hover {
  background: #161b22;
}

.collapse-icon {
  font-size: 0.8rem;
  color: #8b949e;
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

.readonly-badge {
  background: rgba(248, 81, 73, 0.1);
  color: #f85149;
  border: 1px solid rgba(248, 81, 73, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
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
  transition: all 0.2s;
}

.policy-card.collapsed {
  padding: 8px 16px;
}

.policy-card.readonly {
  border-color: rgba(248, 81, 73, 0.2);
  background: rgba(13, 17, 23, 0.6);
}

.collapse-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 4px;
}

.policy-name-input {
  background: transparent;
  border: 1px solid transparent;
  color: #e6edf3;
  font-weight: 600;
  padding: 2px 4px;
  border-radius: 4px;
  width: 150px;
}

.policy-name-input:hover, .policy-name-input:focus {
  background: #0d1117;
  border-color: #30363d;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapsed-info {
  font-size: 0.75rem;
  color: #484f58;
}

.chart-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.presets {
  display: flex;
  gap: 2px;
}

.btn-tiny {
  font-size: 0.6rem;
  padding: 1px 4px;
  background: #21262d;
  border: 1px solid #30363d;
  color: #8b949e;
  border-radius: 3px;
  cursor: pointer;
}

.btn-tiny:hover {
  background: #30363d;
  color: #fff;
}

.svg-wrapper {
  position: relative;
}

.drag-tooltip {
  position: absolute;
  background: #1f6feb;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  pointer-events: none;
  transform: translate(-50%, -120%);
  white-space: nowrap;
  z-index: 10;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.search-input-tiny {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  width: 100px;
}

.quick-ids-grouped {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  padding: 8px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
}

.id-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-label {
  font-size: 0.6rem;
  color: #484f58;
  font-weight: 600;
  text-transform: uppercase;
}

.group-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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

.fan-chart.readonly {
  cursor: default;
  opacity: 0.8;
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

.selected-names-box {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px;
  min-height: 40px;
}

.selected-chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.placeholder {
  color: #484f58;
  font-size: 0.85rem;
  font-style: italic;
}

.remove-icon {
  margin-left: 4px;
  font-size: 1rem;
  line-height: 1;
  opacity: 0.7;
}

.remove-icon:hover {
  opacity: 1;
  color: #ff7b72;
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

.id-chip.readonly {
  background: #30363d;
  border-color: #484f58;
  cursor: default;
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
  color: #e6edf3;
  font-weight: 500;
}

.label-with-desc {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field-desc {
  font-size: 0.7rem;
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

.btn-info {
  background: #1f6feb;
  color: white;
  border: 1px solid rgba(240, 246, 252, 0.1);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
}

.btn-info:hover {
  background: #388bfd;
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

.btn-danger-outline {
  background: transparent;
  color: #f85149;
  border: 1px solid rgba(248, 81, 73, 0.4);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-danger-outline:hover {
  background: rgba(248, 81, 73, 0.1);
  border-color: #f85149;
}

@media (max-width: 900px) {
  .mgmt-card {
    flex-direction: column;
    gap: 20px;
  }
  .mgmt-divider {
    width: 100%;
    height: 1px;
  }
}

.muted {
  font-size: 0.75rem;
  color: #8b949e;
}
</style>

<style>
/* Global styles for recursive TopoNode component */
.topo-block {
  border: 1px solid #30363d;
  border-radius: 6px;
  background: #161b22;
  margin-bottom: 4px;
  transition: all 0.2s;
  overflow: hidden;
  display: block;
}

.topo-block.is-open {
  border-color: #484f58;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.topo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  min-height: 38px;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
}

.topo-header:hover {
  background: rgba(88, 166, 255, 0.08);
}

.topo-header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.topo-icon {
  font-size: 1.1rem;
}

.topo-name {
  font-weight: 600;
  color: #e6edf3;
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
}

.topo-count {
  font-size: 0.7rem;
  color: #8b949e;
  background: #21262d;
  padding: 1px 6px;
  border-radius: 10px;
  border: 1px solid #30363d;
}

.topo-attrs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
  flex: 1;
}

.topo-attr-pill {
  background: #0d1117;
  border: 1px solid #30363d;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  display: flex;
  gap: 4px;
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topo-attr-k {
  color: #8b949e;
}

.topo-attr-v {
  color: #7ee787;
  font-weight: 500;
}

.search-highlight {
  background: rgba(242, 199, 68, 0.4) !important;
  color: #fff !important;
  border-radius: 2px;
  padding: 0 2px;
  font-weight: bold;
}

.topo-toggle {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #21262d;
  border-radius: 4px;
  font-size: 1rem;
  color: #8b949e;
  flex-shrink: 0;
}

.topo-children {
  padding: 10px 0 10px 20px;
  margin-left: 12px;
  border-left: 1px dashed #484f58;
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Node Type Colors */
.node-bus { border-left: 4px solid #1f6feb !important; }
.node-sensor { border-left: 4px solid #f85149 !important; }
.node-fan { border-left: 4px solid #238636 !important; }
.node-compute { border-left: 4px solid #d29922 !important; }
.node-default { border-left: 4px solid #484f58 !important; }
</style>
