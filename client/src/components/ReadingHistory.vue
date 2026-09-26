<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from '@core/useI18n.js'
import TrashIcon from '@core/TrashIcon.vue'
import Icon from './Icon.vue'
import { ICONS } from '@/utils/icons.js'
import { getBookSessions, deleteSession } from '@/api/shelf.js'
import { useLibrary } from '@/composables/useLibrary.js'
import { fmtDate, fmtDuration } from '@/utils/format.js'

const props = defineProps({
  entryId: { type: String, required: true },
  refreshKey: { type: Number, default: 0 },
})

const { t, locale } = useI18n()
const { upsert } = useLibrary()

const sessions = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    sessions.value = await getBookSessions(props.entryId)
  } finally {
    loading.value = false
  }
}

async function remove(s) {
  const res = await deleteSession(s._id)
  sessions.value = sessions.value.filter((x) => x._id !== s._id)
  if (res?.entry) upsert(res.entry)
}

const totalPages = computed(() => sessions.value.reduce((sum, s) => sum + (s.pagesRead || 0), 0))

onMounted(load)
defineExpose({ reload: load })
</script>

<template>
  <section class="flex flex-col gap-3">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {{ t('shelf.history.heading') }}
      <span v-if="sessions.length" class="text-slate-300 dark:text-slate-600">· {{ t('shelf.history.pagesTotal', { count: totalPages }) }}</span>
    </h2>

    <div v-if="loading" class="text-sm text-slate-400 dark:text-slate-500 py-4">{{ t('shelf.state.loading') }}</div>

    <div v-else-if="!sessions.length" class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-400 dark:text-slate-500">
      {{ t('shelf.history.empty') }}
    </div>

    <ul v-else class="flex flex-col">
      <li
        v-for="s in sessions"
        :key="s._id"
        class="group flex items-center gap-3 py-2.5 border-b border-black/5 dark:border-white/8 last:border-0"
      >
        <div class="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Icon :d="ICONS.book" class="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-slate-900 dark:text-white">
            {{ s.pagesRead ? t('shelf.history.readPages', { count: s.pagesRead }) : t('shelf.history.progressLogged') }}
            <span v-if="s.endingPage != null" class="text-slate-400 dark:text-slate-500">· {{ t('shelf.history.toPage', { page: s.endingPage }) }}</span>
          </p>
          <p class="text-xs text-slate-400 dark:text-slate-500">
            {{ fmtDate(s.date, locale) }}<span v-if="s.duration"> · {{ fmtDuration(s.duration) }}</span>
          </p>
        </div>
        <button
          type="button"
          @click="remove(s)"
          :title="t('shelf.history.delete')"
          class="nuc-trash nuc-press cursor-pointer shrink-0 p-1.5 rounded text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <TrashIcon class="w-4 h-4" stroke-width="1.75" />
        </button>
      </li>
    </ul>
  </section>
</template>
