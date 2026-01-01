<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const containerRef = ref(null);
const inputRef = ref(null);

const filteredOptions = computed(() => {
  if (!props.modelValue) return props.options;
  const q = props.modelValue.toLowerCase();
  return props.options.filter(opt => opt.toLowerCase().includes(q));
});

const onInput = (e) => {
  emit('update:modelValue', e.target.value);
  isOpen.value = true;
};

const onFocus = () => {
  isOpen.value = true;
};

const toggleDropdown = () => {
  if (isOpen.value) {
    isOpen.value = false;
  } else {
    isOpen.value = true;
    if (inputRef.value) {
      inputRef.value.focus();
    }
  }
};

const selectOption = (opt) => {
  emit('update:modelValue', opt);
  isOpen.value = false;
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
  <div class="combobox-container" ref="containerRef">
    <div class="input-wrapper">
      <input
        ref="inputRef"
        type="text"
        :value="modelValue"
        @input="onInput"
        @focus="onFocus"
        :placeholder="placeholder"
        class="combobox-input"
      />
      <button class="chevron-btn" @click.stop="toggleDropdown" tabindex="-1" type="button">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" :class="{ rotated: isOpen }">
          <path d="M12.78 6.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.28a.75.75 0 0 1 1.06-1.06L8 9.94l3.72-3.72a.75.75 0 0 1 1.06 0Z"></path>
        </svg>
      </button>
    </div>

    <div class="combobox-dropdown" v-if="isOpen">
      <div
        v-for="opt in filteredOptions"
        :key="opt"
        class="combobox-item"
        @click="selectOption(opt)"
      >
        {{ opt }}
      </div>
      <div v-if="filteredOptions.length === 0 && options.length > 0" class="combobox-empty">
        無符合項目
      </div>
      <div v-if="options.length === 0" class="combobox-empty">
        無可用選項
      </div>
    </div>
  </div>
</template>

<style scoped>
.combobox-container {
  position: relative;
  width: 100%;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.combobox-input {
  width: 100%;
  padding: 10px 36px 10px 12px; /* Right padding for chevron */
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6e9ef;
  font-size: 0.95rem;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.combobox-input:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}

.chevron-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}

.chevron-btn:hover {
  color: #c9d1d9;
  background: rgba(255, 255, 255, 0.1);
}

.chevron-btn svg {
  transition: transform 0.2s;
}

.chevron-btn svg.rotated {
  transform: rotate(180deg);
}

.combobox-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  max-height: 250px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

/* Scrollbar styling for dropdown */
.combobox-dropdown::-webkit-scrollbar {
  width: 8px;
}
.combobox-dropdown::-webkit-scrollbar-track {
  background: #0d1117;
}
.combobox-dropdown::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 4px;
}
.combobox-dropdown::-webkit-scrollbar-thumb:hover {
  background: #58a6ff;
}

.combobox-item {
  padding: 8px 12px;
  cursor: pointer;
  color: #c9d1d9;
  transition: background 0.2s;
  font-size: 0.95rem;
}

.combobox-item:hover {
  background: #1f6feb;
  color: #fff;
}

.combobox-empty {
  padding: 12px;
  color: #8b949e;
  font-style: italic;
  text-align: center;
  font-size: 0.9rem;
}
</style>

