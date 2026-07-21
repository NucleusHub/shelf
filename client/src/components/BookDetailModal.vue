<script setup>
import { ref, computed, watch } from 'vue'
import { getEntry, updateBook, deleteBook } from '@/api/shelf.js'
import { useLibrary } from '@/composables/useLibrary.js'
import { useShelfSettings } from '@/composables/useShelfSettings.js'
import { useI18n } from '@core/useI18n.js'
import { useRegistry } from '@core/useRegistry.js'
import { shelfIndicators } from '@/utils/pluginIndicators.js'
import TemplateModal from '@core/TemplateModal.vue'
import FavoriteHeart from '@core/FavoriteHeart.vue'
import TrashIcon from '@core/TrashIcon.vue'
import CoverImage from './CoverImage.vue'
import RatingControl from './RatingControl.vue'
import BookInfo from './BookInfo.vue'
import NotesSection from './NotesSection.vue'
import ReadingHistory from './ReadingHistory.vue'
import ProgressSheet from './ProgressSheet.vue'
import BookFormModal from './BookFormModal.vue'
import Icon from './Icon.vue'
import { ICONS } from '@/utils/icons.js'
import { STATUS_META } from '@/utils/constants.js'
import { progressPct, authorLabel, seriesLabel, fmtDate } from '@/utils/format.js'
import { resolveTarget, buildOpenUrl } from '@/utils/openTarget.js'

// The book detail as an overlay (not a page). Sub-modals (progress, edit, note
// editor, delete) render at the default z-[200], above this modal's z-[150].
const props = defineProps({
  show: { type: Boolean, default: false },
  entryId: { type: String, default: null },
})
const emit = defineEmits(['close', 'deleted'])

const { t, locale } = useI18n()
const { upsert, remove, getById } = useLibrary()
const { settings } = useShelfSettings()

const entry = ref(null)
const loading = ref(false)
const historyRef = ref(null)
const showProgress = ref(false)
const showEdit = ref(false)
const confirmDelete = ref(false)

const book = computed(() => entry.value?.book || {})
const pct = computed(() => progressPct(entry.value))
const statusMeta = computed(() => STATUS_META[entry.value?.status] || STATUS_META.planned)

// Plugin-contributed badges (e.g. In Common), filtered to the ones enabled.
const { isPluginEnabled } = useRegistry()
const indicators = computed(() => shelfIndicators.filter((i) => isPluginEnabled(i.pluginId)))

// External "open in" destination for this entry (null for non-openable formats).
const openUrl = computed(() => (entry.value ? buildOpenUrl(resolveTarget(entry.value, settings.openDefaults), entry.value) : null))
function openExternal() {
  if (openUrl.value) window.open(openUrl.value, '_blank', 'noopener,noreferrer')
}

watch(() => props.show, async (v) => {
  if (!v) return
  entry.value = getById(props.entryId)     // instant seed from the store
  loading.value = !entry.value
  try {
    entry.value = await getEntry(props.entryId)
  } catch { /* keep the seed */ } finally {
    loading.value = false
  }
})

async function patch(item) {
  const updated = await updateBook(entry.value.id, { item })
  entry.value = updated
  upsert(updated)
}
const setRating = (rating) => patch({ rating })
const toggleFavorite = () => patch({ favorite: !entry.value.favorite })
const markFinished = () => patch({
  status: 'finished',
  finishedReading: entry.value.finishedReading || new Date().toISOString(),
  currentPage: book.value.pageCount || entry.value.currentPage,
})
const resume = () => patch({ status: 'reading' })

function onProgressLogged(res) {
  entry.value = res.entry
  historyRef.value?.reload()
}
async function submitEdit({ book: bookData, item }) {
  const updated = await updateBook(entry.value.id, { book: bookData, item })
  entry.value = updated
  upsert(updated)
  showEdit.value = false
}
async function doDelete() {
  confirmDelete.value = false
  const id = entry.value.id
  await deleteBook(id)
  remove(id)
  emit('deleted', id)
  emit('close')
}
function onNotesCount(count) {
  if (entry.value) { entry.value.notesCount = count; upsert({ ...entry.value }) }
}
</script>

<template>
  <TemplateModal
    :show="show"
    header
    size="xl"
    z="z-[150]"
    :title="book.title || '…'"
    :description="authorLabel(entry) || ''"
    body-class="px-5 sm:px-6 pb-6 pt-2"
    @cancel="emit('close')"
  >
    <div v-if="loading && !entry" class="py-16 text-center text-slate-400 dark:text-slate-500">{{ t('shelf.state.loading') }}</div>

    <div v-else-if="entry" class="flex flex-col gap-7">
      <!-- Header block -->
      <div class="flex flex-col sm:flex-row gap-5">
        <div class="w-32 sm:w-40 shrink-0 mx-auto sm:mx-0">
          <div class="rounded-xl overflow-hidden shadow-lg shadow-slate-900/10 dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/10">
            <CoverImage :src="book.coverUrl" :alt="book.title" />
          </div>
        </div>

        <div class="flex-1 min-w-0 flex flex-col gap-3">
          <div class="flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <p v-if="book.subtitle" class="text-sm text-slate-500 dark:text-slate-400">{{ book.subtitle }}</p>
              <p v-if="seriesLabel(entry)" class="text-sm text-slate-400 dark:text-slate-500">{{ seriesLabel(entry) }}</p>
            </div>
            <div class="shrink-0 flex items-center gap-0.5">
              <button v-if="openUrl" @click="openExternal" :title="t('shelf.open.openIn')" class="nuc-press cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <Icon :d="ICONS.externalLink" class="w-5 h-5" />
              </button>
              <button @click="toggleFavorite" :title="entry.favorite ? t('shelf.card.unfavorite') : t('shelf.card.favorite')" class="nuc-fav nuc-press cursor-pointer p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" :class="entry.favorite ? 'text-rose-500' : 'text-slate-400'">
                <FavoriteHeart :active="entry.favorite" class="w-5 h-5" />
              </button>
              <button @click="showEdit = true" :title="t('shelf.card.edit')" class="nuc-press cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <Icon :d="ICONS.pencil" class="w-5 h-5" />
              </button>
              <button @click="confirmDelete = true" :title="t('shelf.card.delete')" class="nuc-trash nuc-press cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <TrashIcon class="w-5 h-5" stroke-width="1.75" />
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-medium px-2.5 py-1 rounded-full" :class="statusMeta.badge">{{ t(statusMeta.i18n) }}</span>
            <RatingControl :model-value="entry.rating" :max="settings.ratingMax" size="md" @update:modelValue="setRating" />
            <component
              v-for="ind in indicators"
              :key="ind.pluginId"
              :is="ind.component"
              :entry="entry"
            />
          </div>

          <!-- Reading progress -->
          <div class="flex flex-col gap-2 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-white/60 dark:border-white/8 p-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-500 dark:text-slate-400">
                <template v-if="book.pageCount">{{ t('shelf.book.pageOf', { current: entry.currentPage, total: book.pageCount }) }}</template>
                <template v-else>{{ t('shelf.book.noPageCount') }}</template>
              </span>
              <span class="font-semibold text-slate-900 dark:text-white tabular-nums">{{ pct }}%</span>
            </div>
            <div class="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :class="entry.status === 'finished' ? 'bg-green-500' : 'bg-indigo-500'" :style="{ width: `${pct}%` }" />
            </div>
            <div class="flex items-center gap-2 flex-wrap pt-1">
              <button @click="showProgress = true" class="nuc-press cursor-pointer inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
                <Icon :d="ICONS.checkCircle" sw="2" class="w-4 h-4" />
                {{ t('shelf.book.updateProgress') }}
              </button>
              <button v-if="entry.status !== 'finished'" @click="markFinished" class="nuc-press cursor-pointer inline-flex items-center gap-1.5 bg-green-600/90 hover:bg-green-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
                <Icon :d="ICONS.checkThin" sw="2.5" class="w-4 h-4" />
                {{ t('shelf.book.markFinished') }}
              </button>
              <button v-if="entry.status === 'on_hold' || entry.status === 'planned'" @click="resume" class="nuc-press cursor-pointer inline-flex items-center gap-1.5 bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/10 transition-colors">
                {{ t('shelf.book.resume') }}
              </button>
            </div>
            <div v-if="entry.startedReading || entry.finishedReading" class="flex gap-4 text-xs text-slate-400 dark:text-slate-500 pt-1">
              <span v-if="entry.startedReading">{{ t('shelf.book.started', { date: fmtDate(entry.startedReading, locale) }) }}</span>
              <span v-if="entry.finishedReading">{{ t('shelf.book.finished', { date: fmtDate(entry.finishedReading, locale) }) }}</span>
            </div>
          </div>
        </div>
      </div>

      <BookInfo :entry="entry" />
      <NotesSection :entry-id="entry.id" @count="onNotesCount" />
      <ReadingHistory ref="historyRef" :entry-id="entry.id" />
    </div>

    <!-- Sub-modals (render above this one) -->
    <ProgressSheet :show="showProgress" :entry="entry" @close="showProgress = false" @logged="onProgressLogged" />
    <BookFormModal :show="showEdit" :initial="entry" @close="showEdit = false" @submit="submitEdit" />
    <TemplateModal
      :show="confirmDelete"
      :title="t('shelf.delete.title')"
      :message="t('shelf.delete.message', { title: book.title })"
      :confirm-label="t('shelf.delete.confirm')"
      @confirm="doDelete"
      @cancel="confirmDelete = false"
    />
  </TemplateModal>
</template>
