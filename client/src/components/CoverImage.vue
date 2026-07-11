<script setup>
// A book cover with a graceful fallback: shows the image when present, otherwise
// a centered book glyph on a soft tint. Used on cards, the detail header, the
// form and search rows so covers look consistent everywhere. Always a 2:3 box.
import { ref, watch } from 'vue'
import Icon from './Icon.vue'
import { ICONS } from '@/utils/icons.js'

const props = defineProps({
  src: { type: String, default: null },
  alt: { type: String, default: '' },
  // `fill` drops the fixed 2:3 aspect and fills the parent instead — used by the
  // list-view row, where the cover stretches to the row height.
  fill: { type: Boolean, default: false },
})

// Fall back to the glyph if the remote image 404s (dead cover URLs are common
// from metadata providers).
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
