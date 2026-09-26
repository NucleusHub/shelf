<script setup>
import { ref, watch } from 'vue'
import Icon from './Icon.vue'
import { ICONS } from '@/utils/icons.js'

const props = defineProps({
  src: { type: String, default: null },
  alt: { type: String, default: '' },
  fill: { type: Boolean, default: false },
})

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
</script>

<template>
  <div class="relative overflow-hidden bg-slate-100 dark:bg-slate-700/60" :class="fill ? 'w-full h-full' : 'w-full aspect-[2/3]'">
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      loading="lazy"
      class="w-full h-full object-cover"
      @error="failed = true"
    />
    <div v-else class="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
      <Icon :d="ICONS.book" sw="1.25" class="w-1/3 h-1/3" />
    </div>
  </div>
</template>
