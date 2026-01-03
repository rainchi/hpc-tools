<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: [String, Number],
  options: {
    type: Array,
    required: true
    // Each option can be { value, label } or just a string
  },
  placeholder: { type: String, default: '請選擇...' }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const containerRef = ref(null);

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const selectOption = (opt) => {
  const val = typeof opt === 'object' ? opt.value : opt;
  emit('update:modelValue', val);
  isOpen.value = false;
};

const getLabel = (val) => {
  const opt = props.options.find(o => (typeof o === 'object' ? o.value : o) === val);
  if (!opt) return val || props.placeholder;
  return typeof opt === 'object' ? opt.label : opt;
};

const handleClickOutside = (event) => {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="custom-select" ref="containerRef">
    <div class="select-trigger" @click="toggleDropdown" :class="{ active: isOpen }">
      <span class="selected-text">{{ getLabel(modelValue) }}</span>
      <span class="chevron" :class="{ rotated: isOpen }">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M12.78 6.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.28a.75.75 0 0 1 1.06-1.06L8 9.94l3.72-3.72a.75.75 0 0 1 1.06 0Z"></path>
        </svg>
      </span>
    </div>

    <transition name="fade-slide">
      <div class="select-dropdown" v-if="isOpen">
        <div
          v-for="opt in options"
          :key="typeof opt === 'object' ? opt.value : opt"
          class="select-item"
          :class="{ selected: (typeof opt === 'object' ? opt.value : opt) === modelValue }"
          @click="selectOption(opt)"
        >
          {{ typeof opt === 'object' ? opt.label : opt }}
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.custom-select {
  position: relative;
  width: 100%;
  user-select: none;
}

.select-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6e9ef;
  font-size: 0.95rem;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.select-trigger:hover {
  border-color: #444c56;
}

.select-trigger.active {
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}

.chevron {
  display: flex;
  align-items: center;
  transition: transform 0.2s;
  color: #8b949e;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 100;
  max-height: 250px;
  overflow-y: auto;
  padding: 4px;
}

.select-item {
  padding: 8px 12px;
  border-radius: 4px;
  color: #c9d1d9;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.select-item:hover {
  background: #21262d;
  color: #fff;
}

.select-item.selected {
  background: #1f6feb22;
  color: #58a6ff;
  font-weight: 600;
}

/* Animation */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
