<script setup>
import { computed } from 'vue'
import { useI18n } from '@core/useI18n.js'
import { computeStats } from '@/utils/stats.js'

const props = defineProps({
  entries: { type: Array, default: () => [] },
  sessions: { type: Array, default: () => [] },
  ratingMax: { type: Number, default: 10 },
})

const { t, locale } = useI18n()
const s = computed(() => computeStats(props.entries, props.sessions))

const year = new Date().getFullYear()
const monthMax = computed(() => Math.max(1, ...s.value.monthly.map((m) => m.pages)))
const monthLabel = (m) => new Date(m.year, m.month, 1).toLocaleDateString(locale.value, { month: 'short' })

const ratingRows = computed(() => {
  const dist = s.value.ratingDistribution
  const max = Math.max(1, ...Object.values(dist))
  return Object.keys(dist)
    .map(Number)
    .sort((a, b) => b - a)
    .map((rating) => ({ rating, count: dist[rating], pct: (dist[rating] / max) * 100 }))
})

const tiles = computed(() => [
  { label: t('shelf.stats.finishedThisYear', { year }), value: s.value.finishedThisYear, accent: 'text-green-500 dark:text-green-400' },
  { label: t('shelf.stats.currentlyReading'), value: s.value.currentlyReading, accent: 'text-blue-500 dark:text-blue-400' },
  { label: t('shelf.stats.pagesThisYear'), value: s.value.pagesThisYear.toLocaleString(locale.value), accent: 'text-indigo-600 dark:text-indigo-400' },
  { label: t('shelf.stats.avgRating'), value: s.value.avgRating != null ? `${s.value.avgRating}/${props.ratingMax}` : '—', accent: 'text-amber-500 dark:text-amber-400' },
  { label: t('shelf.stats.streak'), value: t('shelf.stats.dayCount', { count: s.value.streak }), accent: 'text-rose-500 dark:text-rose-400' },
])
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div v-for="tile in tiles" :key="tile.label" class="bg-white/80 dark:bg-slate-800/70 border border-white/60 dark:border-white/8 rounded-xl p-4 flex flex-col gap-1 shadow-sm dark:shadow-none">
        <p class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-tight">{{ tile.label }}</p>
        <p class="text-2xl font-bold tabular-nums" :class="tile.accent">{{ tile.value }}</p>
      </div>
    </div>

    <div class="bg-white/80 dark:bg-slate-800/70 border border-white/60 dark:border-white/8 rounded-xl p-4 flex flex-col gap-3 shadow-sm dark:shadow-none">
      <p class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">{{ t('shelf.stats.monthlyActivity') }}</p>
      <div class="flex items-end justify-between gap-1.5 h-32">
        <div v-for="m in s.monthly" :key="m.key" class="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div class="w-full flex-1 flex items-end">
            <div class="w-full rounded-t bg-indigo-500/80 dark:bg-indigo-500 transition-all duration-500" :style="{ height: `${(m.pages / monthMax) * 100}%` }" :title="t('shelf.stats.pagesCount', { count: m.pages })" />
          </div>
          <span class="text-[10px] text-slate-400 dark:text-slate-500 truncate w-full text-center">{{ monthLabel(m) }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="bg-white/80 dark:bg-slate-800/70 border border-white/60 dark:border-white/8 rounded-xl p-4 flex flex-col gap-3 shadow-sm dark:shadow-none">
        <p class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">{{ t('shelf.stats.topGenres') }}</p>
        <div v-if="s.topGenres.length" class="flex flex-col gap-2">
          <div v-for="g in s.topGenres" :key="g.name" class="flex items-center gap-2">
            <span class="text-sm text-slate-700 dark:text-slate-300 w-28 truncate shrink-0">{{ g.name }}</span>
            <div class="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full" :style="{ width: `${(g.count / s.topGenres[0].count) * 100}%` }" />
            </div>
            <span class="text-xs text-slate-400 dark:text-slate-500 w-4 text-right shrink-0">{{ g.count }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400 dark:text-slate-500">{{ t('shelf.stats.noData') }}</p>
      </div>

      <div class="bg-white/80 dark:bg-slate-800/70 border border-white/60 dark:border-white/8 rounded-xl p-4 flex flex-col gap-3 shadow-sm dark:shadow-none">
        <p class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">{{ t('shelf.stats.topAuthors') }}</p>
        <div v-if="s.topAuthors.length" class="flex flex-col gap-2">
          <div v-for="a in s.topAuthors" :key="a.name" class="flex items-center gap-2">
            <span class="text-sm text-slate-700 dark:text-slate-300 w-28 truncate shrink-0">{{ a.name }}</span>
            <div class="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-violet-500 rounded-full" :style="{ width: `${(a.count / s.topAuthors[0].count) * 100}%` }" />
            </div>
            <span class="text-xs text-slate-400 dark:text-slate-500 w-4 text-right shrink-0">{{ a.count }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400 dark:text-slate-500">{{ t('shelf.stats.noData') }}</p>
      </div>
    </div>

    <div v-if="ratingRows.length" class="bg-white/80 dark:bg-slate-800/70 border border-white/60 dark:border-white/8 rounded-xl p-4 flex flex-col gap-3 shadow-sm dark:shadow-none">
      <p class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">{{ t('shelf.stats.ratingDistribution') }}</p>
      <div class="flex flex-col gap-2">
        <div v-for="r in ratingRows" :key="r.rating" class="flex items-center gap-2">
          <span class="text-sm text-amber-500 dark:text-amber-400 w-12 shrink-0 tabular-nums">★ {{ r.rating }}</span>
          <div class="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full bg-amber-400 rounded-full" :style="{ width: `${r.pct}%` }" />
          </div>
          <span class="text-xs text-slate-400 dark:text-slate-500 w-4 text-right shrink-0">{{ r.count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
