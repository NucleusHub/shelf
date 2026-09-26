<script setup>
import { computed } from 'vue'
import { useI18n } from '@core/useI18n.js'
import { FORMAT_META } from '@/utils/constants.js'

const props = defineProps({
  entry: { type: Object, required: true },
})

const { t } = useI18n()
const book = computed(() => props.entry.book || {})

const rows = computed(() => {
  const b = book.value
  const list = []
  if (b.authors?.length) list.push({ label: t('shelf.info.authors'), value: b.authors.join(', ') })
  if (b.series?.name) list.push({ label: t('shelf.info.series'), value: b.series.position != null ? `${b.series.name} #${b.series.position}` : b.series.name })
  if (b.genres?.length) list.push({ label: t('shelf.info.genres'), value: b.genres.join(', ') })
  if (b.publisher) list.push({ label: t('shelf.info.publisher'), value: b.publisher })
  if (b.publishedDate) list.push({ label: t('shelf.info.published'), value: b.publishedDate })
  if (b.pageCount) list.push({ label: t('shelf.info.pages'), value: String(b.pageCount) })
  if (b.language) list.push({ label: t('shelf.info.language'), value: b.language })
  if (b.isbn) list.push({ label: t('shelf.info.isbn'), value: b.isbn })
  list.push({ label: t('shelf.info.format'), value: t(FORMAT_META[props.entry.format]?.i18n || 'shelf.format.physical') })
  return list
})
</script>

<template>
  <section class="flex flex-col gap-3">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ t('shelf.info.heading') }}</h2>

    <p v-if="book.description" class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words">{{ book.description }}</p>

    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
      <div v-for="row in rows" :key="row.label" class="flex flex-col min-w-0">
        <dt class="text-xs text-slate-400 dark:text-slate-500">{{ row.label }}</dt>
        <dd class="text-sm text-slate-800 dark:text-slate-200 break-words">{{ row.value }}</dd>
      </div>
    </dl>
  </section>
</template>
