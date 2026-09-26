<script setup>
import { ref, computed } from 'vue'
import Icon from './Icon.vue'
import { ICONS } from '@/utils/icons.js'
import { useI18n } from '@core/useI18n.js'

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Number, default: null },
  max: { type: Number, default: 10 },
  readonly: { type: Boolean, default: false },
  size: { type: String, default: 'md' },
  showValue: { type: Boolean, default: true },
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const hover = ref(0)
const clearLabel = computed(() => t('shelf.form.clearRating'))
const shown = computed(() => hover.value || props.modelValue || 0)
const sizeClass = computed(() => ({ sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-7 h-7' }[props.size]))

function fill(n) {
  const v = shown.value
  if (v >= n) return 100
  if (v >= n - 0.5) return 50
  return 0
}

function set(v) {
  if (props.readonly) return
  emit('update:modelValue', props.modelValue === v ? null : v)
}
</script>

<template>
  <div v-if="compact" class="inline-flex items-center gap-1">
    <Icon :d="ICONS.star" fill :class="[sizeClass, 'text-amber-400']" />
    <span class="text-sm font-medium text-slate-600 dark:text-slate-300 tabular-nums">{{ modelValue }}<span class="text-slate-400 dark:text-slate-500">/{{ max }}</span></span>
  </div>
  <div v-else class="inline-flex items-center gap-2">
    <div class="flex items-center" :class="readonly ? '' : 'gap-0.5'" @mouseleave="hover = 0">
      <div
        v-for="n in max"
        :key="n"
        class="relative inline-flex"
        :class="[sizeClass, readonly ? '' : 'transition-transform hover:scale-110']"
      >
        <Icon
          :d="ICONS.star"
          sw="1.5"
          :class="[sizeClass, 'text-slate-300 dark:text-slate-600']"
        />
        <div class="absolute inset-0 overflow-hidden pointer-events-none" :style="{ width: fill(n) + '%' }">
          <Icon :d="ICONS.star" fill :class="[sizeClass, 'max-w-none text-amber-400']" />
        </div>
        <template v-if="!readonly">
          <button
            type="button"
            class="absolute inset-y-0 left-0 w-1/2 cursor-pointer nuc-press"
            :aria-label="`${n - 0.5} / ${max}`"
            @click="set(n - 0.5)"
            @mouseenter="hover = n - 0.5"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 w-1/2 cursor-pointer nuc-press"
            :aria-label="`${n} / ${max}`"
            @click="set(n)"
            @mouseenter="hover = n"
          />
        </template>
      </div>
    </div>
    <span v-if="showValue && modelValue" class="text-sm font-medium text-slate-500 dark:text-slate-400 tabular-nums">
      {{ modelValue }}<span class="text-slate-400 dark:text-slate-600">/{{ max }}</span>
    </span>
    <button
      v-if="!readonly && modelValue"
      type="button"
      class="nuc-press cursor-pointer text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors"
      :aria-label="clearLabel"
      :title="clearLabel"
      @click="emit('update:modelValue', null)"
    >
      <Icon :d="ICONS.close" sw="2" class="w-4 h-4" />
    </button>
  </div>
</template>
