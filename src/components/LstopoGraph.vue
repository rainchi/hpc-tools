<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
});

// Filter out noise for HPC view:
// - Hide L1/L2 caches (usually too granular, L3 is enough for locality)
// - Hide Bridges (unless they have important children, but usually just clutter)
// - Hide Misc/Info unless they contain hardware ID (DMI, Product, etc.)
// - Keep PCI devices, GPUs, NICs, NUMA, Cores, PUs
const interestingKeys = ['DMI', 'Product', 'Model', 'Vendor', 'Board', 'Serial', 'Asset', 'Memory', 'DIMM', 'Bank'];

const showDetails = ref(false);

const isMemoryModule = computed(() => {
  return props.node.subtype === 'MemoryModule' || props.node.attr?.subtype === 'MemoryModule';
});

const toggleDetails = () => {
  if (isMemoryModule.value) {
    showDetails.value = !showDetails.value;
  }
};

const isVisibleNode = computed(() => {
  const type = props.node.type;
  if (!type) return true;
  // Hide L1/L2 caches to reduce clutter
  if (type.match(/L1|L2/i)) return false;
  // Hide Bridges to flatten the tree (but keep children via pass-through)
  if (type === 'Bridge') return false;

  // Handle Info/Misc nodes
  if (type.toLowerCase() === 'info' || type === 'Misc') {
    // Always show MemoryModules
    if (isMemoryModule.value) return true;

    const name = props.node.attr?.name || '';
    // Only show hardware identification info
    return interestingKeys.some(k => name.includes(k));
  }

  return true;
});

const pciInfo = computed(() => {
  const attr = props.node.attr;
  if (!attr) return null;
  const info = [];
  if (attr.pci_link_speed) info.push(`${attr.pci_link_speed} GT/s`);
  if (attr.pci_link_width) info.push(`x${attr.pci_link_width}`);
  return info.join(' ');
});

const deviceName = computed(() => {
  const attr = props.node.attr || {};
  const type = props.node.type ? props.node.type.toLowerCase() : '';

  if (isMemoryModule.value) {
    // Extract summary for Memory Module
    const children = props.node.children || [];
    const getVal = (k) => children.find(c => c.attr?.name === k)?.attr?.value;

    const size = getVal('Size');
    const type = getVal('Type');
    const loc = getVal('DeviceLocation') || getVal('BankLocation');
    const speed = getVal('Speed') || getVal('ConfiguredSpeed');

    let parts = [];
    if (size) {
        // Assuming KB based on typical hwloc/lstopo output
        const gb = parseInt(size) / 1024 / 1024;
        if (gb >= 1) parts.push(`${gb.toFixed(0)}GB`);
        else parts.push(`${(parseInt(size)/1024).toFixed(0)}MB`);
    }
    if (type) parts.push(type);
    if (speed) parts.push(speed);
    if (loc) parts.push(`@ ${loc}`);

    return parts.length > 0 ? parts.join(' ') : 'DIMM';
  }

  // For <info> tags, the value is in attr.value
  if (type === 'info' && attr.value) return `${attr.name}: ${attr.value}`;

  let name = attr.name || '';
  if (!name && attr.pci_busid) name = attr.pci_busid;

  // Parse "Key=Value" strings (common in Misc nodes)
  if (name.includes('=')) {
    return name.replace('=', ': ');
  }

  return name;
});

const isGpu = computed(() => {
  const name = deviceName.value.toLowerCase();
  return name.includes('nvidia') || name.includes('gpu') || props.node.type === 'GPU';
});

const isNic = computed(() => {
  const name = deviceName.value.toLowerCase();
  return name.includes('mellanox') || name.includes('infiniband') || name.includes('eth') || name.includes('mlx');
});

const isInfoNode = computed(() => {
  const type = props.node.type ? props.node.type.toLowerCase() : '';
  return type === 'info' || type === 'misc';
});

const processedChildren = computed(() => {
  // Prevent infinite recursion: Don't re-group children of a group we just created
  if (props.node.type === 'InfoGroup') return props.node.children || [];

  const children = props.node.children;
  if (!children || !children.length) return [];

  const dmiGroup = [];
  const pciGroup = [];
  const infoGroup = [];
  const others = [];

  // If current node is a Bridge (which is hidden), we skip its Info/Misc children
  // to prevent them from appearing as floating nodes in the parent.
  const isHiddenBridge = props.node.type === 'Bridge';

  // For MemoryModules, we want to show details directly, but maybe grouped is cleaner?
  // Let's keep them grouped in 'Details' for now, or maybe 'Specs'
  const isMemory = isMemoryModule.value;

  children.forEach(child => {
    const type = child.type ? child.type.toLowerCase() : '';
    const name = child.attr ? (child.attr.name || '') : '';
    const childSubtype = child.subtype || (child.attr ? child.attr.subtype : '');
    const isChildMemory = childSubtype === 'MemoryModule';

    if ((type === 'info' || type === 'misc') && !isChildMemory) {
      if (isHiddenBridge) return;

      if (name.startsWith('DMI')) {
        dmiGroup.push(child);
      } else if (name.startsWith('PCIVendor')) {
        pciGroup.push(child);
      } else {
        // Group other interesting info nodes
        // For MemoryModule, we want to show Size, Type, Speed, Vendor, etc.
        // We allow all info children for MemoryModule
        if (isMemory) {
             infoGroup.push(child);
        } else {
            const interesting = interestingKeys.some(k => name.includes(k));
            if (interesting) {
              infoGroup.push(child);
            }
        }
      }
    } else {
      others.push(child);
    }
  });

  const result = [...others];

  if (dmiGroup.length > 0) {
    result.push({
      type: 'InfoGroup',
      attr: { name: 'DMI Info' },
      children: dmiGroup
    });
  }

  if (pciGroup.length > 0) {
    result.push({
      type: 'InfoGroup',
      attr: { name: 'PCI Vendor' },
      children: pciGroup
    });
  }

  if (infoGroup.length > 0) {
    // For Memory, don't wrap in a group, just show the items directly when expanded
    if (isMemory) {
      result.push(...infoGroup);
    } else {
      result.push({
        type: 'InfoGroup',
        attr: { name: 'Details' },
        children: infoGroup
      });
    }
  }

  return result;
});
</script>

<template>
  <!-- Case 1: Visible Node (Render Box) -->
  <div v-if="isVisibleNode" class="topo-obj"
    :class="[
      node.type ? node.type.toLowerCase() : 'unknown',
      node.subtype ? node.subtype.toLowerCase() : '',
      { 'is-gpu': isGpu, 'is-nic': isNic, 'is-info': isInfoNode, 'is-clickable': isMemoryModule }
    ]"
    @click.stop="toggleDetails"
  >
    <div class="obj-header">
      <span class="obj-type">{{ node.type }}</span>

      <!-- Index for Cores/PUs/NUMA -->
      <span v-if="node.attr.os_index !== undefined" class="obj-index">#{{ node.attr.os_index }}</span>

      <!-- PCI Bus ID -->
      <span v-if="node.attr.pci_busid" class="obj-busid">[{{ node.attr.pci_busid }}]</span>

      <!-- Name (GPU/NIC model or Info Value) -->
      <span v-if="deviceName" class="obj-name" :title="deviceName">{{ deviceName }}</span>

      <!-- Memory Size -->
      <span v-if="node.attr.local_memory" class="obj-mem">
        {{ (parseInt(node.attr.local_memory) / 1024 / 1024 / 1024).toFixed(0) }}GB
      </span>

      <!-- Interconnect Info (Link Speed/Width) -->
      <span v-if="pciInfo" class="obj-link">{{ pciInfo }}</span>

      <!-- Expand indicator for Memory -->
      <span v-if="isMemoryModule" class="obj-expand-icon">{{ showDetails ? '−' : '+' }}</span>
    </div>

    <div class="obj-children" v-if="processedChildren.length && (!isMemoryModule || showDetails)">
      <LstopoGraph v-for="(child, i) in processedChildren" :key="i" :node="child" />
    </div>
  </div>

  <!-- Case 2: Hidden Node (Pass-through children) -->
  <template v-else>
    <LstopoGraph v-for="(child, i) in processedChildren" :key="i" :node="child" />
  </template>
</template>

<style scoped>
.topo-obj {
  border: 1px solid #30363d;
  padding: 2px;
  margin: 2px 1px; /* Ultra compact margins */
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  min-width: fit-content;
  position: relative;
  align-items: center;
}

/* Vertical line above child nodes */
.topo-obj::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  width: 1px;
  height: 4px;
  background-color: #555;
}
/* Hide line for root node (Machine) if it's the top level */
.machine.topo-obj::before {
  display: none;
}

.obj-header {
  font-size: 0.7rem;
  color: #8b949e;
  margin-bottom: 2px;
  display: flex;
  gap: 4px;
  white-space: nowrap;
  align-items: center;
  z-index: 1;
  background: #161b22; /* Opaque background to cover lines if needed */
  padding: 1px 4px;
  border-radius: 4px;
}

.obj-type { font-weight: bold; text-transform: uppercase; font-size: 0.65rem; opacity: 0.7; }
.obj-index { color: #e6e9ef; font-family: monospace; font-weight: bold; }
.obj-busid { color: #8b949e; font-family: monospace; font-size: 0.65rem; }
.obj-name { color: #79c0ff; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
.obj-mem { color: #d29922; font-weight: bold; }
.obj-link {
  background: #1f6feb;
  color: white;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.6rem;
  font-family: monospace;
}

.obj-children {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  justify-content: center;
  align-items: flex-start;
  position: relative;
  padding-top: 4px;
  width: 100%;
}

/* Connector lines from parent to children */
.obj-children::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 4px;
  background-color: #555;
}

/* Horizontal bar connecting children */
.obj-children::after {
  content: '';
  position: absolute;
  top: 4px; /* Matches height of ::before */
  left: 20px; /* Approximate offset to cover first child */
  right: 20px; /* Approximate offset to cover last child */
  height: 1px;
  background-color: #555;
  /* Only show if multiple children? Hard to detect in CSS.
     This is a rough approximation for tree view. */
  display: none;
}
/* Enable horizontal bar if we want a stricter tree look,
   but with flex-wrap it breaks. Keeping vertical lines is safer. */

/* Specific styles for types */
.machine { border-color: #58a6ff; background: rgba(88, 166, 255, 0.05); }
.package { border-color: #d29922; background: rgba(210, 153, 34, 0.05); }
.core { border-color: #3fb950; background: rgba(63, 185, 80, 0.05); padding: 2px; }

/* Compact PU (Thread) */
.pu {
  background: #238636;
  color: white;
  border: none;
  min-width: 20px;
  justify-content: center;
  align-items: center;
  padding: 0px 2px;
  margin: 1px;
}
.pu::before { display: none; } /* No lines for PUs to keep them compact */
.pu .obj-header { margin: 0; justify-content: center; gap: 0; background: transparent; }
.pu .obj-type, .pu .obj-name, .pu .obj-mem, .pu .obj-link, .pu .obj-busid { display: none; }
.pu .obj-index { color: white; font-size: 0.75rem; }

/* Caches */
.l3cache, .cache {
  border-style: dashed;
  border-color: #8b949e;
  background: rgba(139, 148, 158, 0.05);
  /* Removed width: 100% to allow side-by-side placement */
}

.numanode {
  border-color: #a371f7;
  background: rgba(163, 113, 247, 0.05);
  min-width: fit-content; /* Allow shrinking */
}

/* PCI Devices */
.pci, .osdev {
  border-color: #8b949e;
  background: rgba(255, 255, 255, 0.03);
}

/* Highlight GPUs */
.is-gpu {
  border-color: #2ea043;
  background: rgba(46, 160, 67, 0.1);
  box-shadow: 0 0 0 1px #2ea043;
}
.is-gpu .obj-name { color: #7ee787; font-weight: bold; }

/* Highlight NICs */
.is-nic {
  border-color: #1f6feb;
  background: rgba(31, 111, 235, 0.1);
}
.is-nic .obj-name { color: #a5d6ff; }

/* Info/Misc Nodes */
.is-info {
  border-color: #3fb950;
  background: rgba(63, 185, 80, 0.05);
  padding: 2px 6px;
  margin: 2px;
}
.is-info .obj-type { display: none; } /* Hide 'Info' label */
.is-info .obj-name { color: #7ee787; font-size: 0.8rem; font-family: monospace; }
.is-info::before { display: none; } /* No connector lines for info */

/* Info Groups */
.infogroup {
  border: 1px solid #30363d;
  background: rgba(255, 255, 255, 0.02);
  margin: 2px;
  padding: 2px;
  border-radius: 6px;
  align-items: stretch;
}
.infogroup .obj-header {
  justify-content: center;
  background: transparent;
  border-bottom: 1px solid #30363d;
  margin-bottom: 6px;
}
.infogroup .obj-type { display: none; }
.infogroup .obj-name { color: #8b949e; font-weight: bold; font-size: 0.8rem; }
.infogroup::before { display: none; } /* No top connector for group itself */

/* Memory Modules */
.memorymodule {
  border-color: #d29922;
  background: rgba(210, 153, 34, 0.05);
  min-width: 100px;
  transition: background-color 0.2s;
}
.memorymodule.is-clickable:hover {
  background: rgba(210, 153, 34, 0.15);
  cursor: pointer;
}
.memorymodule .obj-name {
  color: #d29922;
  font-weight: bold;
}
.obj-expand-icon {
  margin-left: 4px;
  font-weight: bold;
  color: #8b949e;
}
</style>
