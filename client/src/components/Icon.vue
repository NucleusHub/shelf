<script setup>
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
