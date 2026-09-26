<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  id: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="base-input-group" :class="{ 'has-error': Boolean(error) }">
    <label v-if="label" :for="id" class="input-label">
      {{ label }}
      <span v-if="required" class="required-star">*</span>
    </label>

    <div class="input-wrapper">
      <slot name="prefix" />
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        class="base-input-control"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <slot name="suffix" />
    </div>

    <span v-if="error" class="input-error-msg">{{ error }}</span>
    <span v-else-if="hint" class="input-hint-msg">{{ hint }}</span>
  </div>
</template>

<style scoped>
.base-input-group {
  display: grid;
  gap: 6px;
  width: 100%;
}

.input-label {
  color: #374151;
  font-size: 12.5px;
  font-weight: 600;
}

.required-star {
  color: #ef4444;
  margin-left: 2px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  padding: 0 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-wrapper:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.has-error .input-wrapper {
  border-color: #ef4444;
}

.base-input-control {
  width: 100%;
  padding: 10px 0;
  border: 0;
  outline: 0;
  color: #111827;
  background: transparent;
  font-size: 13.5px;
}

.base-input-control::placeholder {
  color: #9ca3af;
}

.input-error-msg {
  color: #b91c1c;
  font-size: 11px;
  font-weight: 500;
}

.input-hint-msg {
  color: #6b7280;
  font-size: 11px;
}
</style>
