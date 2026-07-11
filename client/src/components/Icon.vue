<script setup>
// Renders one of the shared icon paths from utils/icons.js:
//   <Icon :d="ICONS.search" class="w-4 h-4" />
// `d` may be a single path string or an array (multi-path glyphs). Stroke icons
// by default; pass :fill for solid glyphs (star, kebab). Size/colour come from
// the class on the element (currentColor), like the app's other icons.
import { computed } from 'vue'

const props = defineProps({
  d: { type: [String, Array], required: true },
  fill: { type: Boolean, default: false },
  sw: { type: [Number, String], default: 1.75 },
})

const paths = computed(() => (Array.isArray(props.d) ? props.d : [props.d]))
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    :fill="fill ? 'currentColor' : 'none'"
    :stroke="fill ? undefined : 'currentColor'"
    :stroke-width="fill ? undefined : sw"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(p, i) in paths" :key="i" :d="p" />
  </svg>
</template>
