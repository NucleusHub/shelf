<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { createBook, updateBook, deleteBook, getSessions } from '@/api/shelf.js'
import { useLibrary } from '@/composables/useLibrary.js'
import { useShelfSettings } from '@/composables/useShelfSettings.js'
import { useI18n } from '@core/useI18n.js'
import { useSettingsModal } from '@core/useSettingsModal.js'
import AppHeader from '@core/AppHeader.vue'
import AppSidebar from '@core/AppSidebar.vue'
import BackgroundBlobs from '@core/BackgroundBlobs.vue'
import TemplateModal from '@core/TemplateModal.vue'
import FavoriteHeart from '@core/FavoriteHeart.vue'
import BookCard from '@/components/BookCard.vue'
import BookFormModal from '@/components/BookFormModal.vue'
import BookDetailModal from '@/components/BookDetailModal.vue'
import ProgressSheet from '@/components/ProgressSheet.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import ShelfStats from '@/components/ShelfStats.vue'
import Icon from '@/components/Icon.vue'
import { ICONS } from '@/utils/icons.js'
import { STATUSES, STATUS_META, FORMAT_META, SORTS } from '@/utils/constants.js'
import { progressPct } from '@/utils/format.js'

const { t } = useI18n()
const { entries, loading, error, load, upsert, remove } = useLibrary()
const { settings } = useShelfSettings()
const { open: settingsOpen, openSettings, closeSettings } = useSettingsModal()

const sidebarOpen = ref(false)

// Statistics is an inline toggle (like watchlist), not a route. Sessions are
// fetched lazily the first time stats is opened.
const showStats = ref(false)
const sessions = ref([])
let statsLoaded = false
async function toggleStats() {
  showStats.value = !showStats.value
  if (showStats.value && !statsLoaded) {
    statsLoaded = true
    try { sessions.value = await getSessions() } catch { statsLoaded = false }
  }
}

// View (grid/list) — remembered locally, seeded from the user's default.
const view = ref(localStorage.getItem('shelf-view') || settings.defaultView || 'grid')
watch(view, (v) => localStorage.setItem('shelf-view', v))

// ── Filters / sort / search ──────────────────────────────────────────────────
const activeStatus = ref('all')
const filterGenre = ref('')
const filterAuthor = ref('')
const filterFormat = ref('')
const onlyFavorite = ref(false)
const onlyOwned = ref(false)
const searchQuery = ref('')
const sortBy = ref('updated')
const sortDir = ref('desc')

const STATUS_TABS = computed(() => [
  { key: 'all', label: t('shelf.status.all') },
  ...STATUSES.map((s) => ({ key: s, label: t(STATUS_META[s].i18n) })),
])

// Facet option lists, derived from the library so filters only offer real values.
const genreOptions = computed(() => uniqueSorted(entries.value.flatMap((e) => e.book?.genres || [])))
const authorOptions = computed(() => uniqueSorted(entries.value.flatMap((e) => e.book?.authors || [])))
function uniqueSorted(list) {
  return [...new Set(list.map((x) => String(x).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

// Watchlist-style sort: click an icon to sort by it (natural direction), click
// the active one again to flip the direction.
const SORT_DEFAULT_DIR = Object.fromEntries(SORTS.map((s) => [s.key, s.dir]))
function toggleSort(key) {
  if (sortBy.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = key; sortDir.value = SORT_DEFAULT_DIR[key] || 'asc' }
}

// Shared styling for the filter chips (selects + toggles) so the toolbar reads
// as one consistent set of controls.
const CHIP_BASE = 'rounded-lg py-1.5 text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40'
const CHIP_IDLE = 'bg-white/70 dark:bg-white/8 border-white/70 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/12'
const CHIP_ACTIVE = 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-400/30 text-indigo-700 dark:text-indigo-300'

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const base = entries.value.filter((e) => {
    const b = e.book || {}
    if (activeStatus.value !== 'all' && e.status !== activeStatus.value) return false
    if (filterGenre.value && !(b.genres || []).includes(filterGenre.value)) return false
    if (filterAuthor.value && !(b.authors || []).includes(filterAuthor.value)) return false
    if (filterFormat.value && e.format !== filterFormat.value) return false
    if (onlyFavorite.value && !e.favorite) return false
    if (onlyOwned.value && !e.owned) return false
    if (q) {
      const hay = `${b.title || ''} ${b.subtitle || ''} ${(b.authors || []).join(' ')} ${b.series?.name || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...base].sort((a, b) => cmp(a, b) * dir)
})

// Milliseconds for a date, or 0 for missing/invalid — a comparator must never
// return NaN (it makes Array.sort ordering undefined for the whole list).
function time(v) {
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? 0 : t
}

function cmp(a, b) {
  switch (sortBy.value) {
    case 'title': return (a.book?.title || '').localeCompare(b.book?.title || '')
    case 'author': return (a.book?.authors?.[0] || '').localeCompare(b.book?.authors?.[0] || '')
    case 'added': return time(a.createdAt) - time(b.createdAt)
    case 'updated': return time(a.updatedAt) - time(b.updatedAt)
    case 'rating': return (a.rating ?? -1) - (b.rating ?? -1)
    case 'progress': return progressPct(a) - progressPct(b)
    default: return 0
  }
}

const hasFilters = computed(() =>
  activeStatus.value !== 'all' || filterGenre.value || filterAuthor.value ||
  filterFormat.value || onlyFavorite.value || onlyOwned.value || searchQuery.value
)
function clearFilters() {
  activeStatus.value = 'all'; filterGenre.value = ''; filterAuthor.value = ''
  filterFormat.value = ''; onlyFavorite.value = false; onlyOwned.value = false; searchQuery.value = ''
}

const gridClass = computed(() =>
  view.value === 'list'
    ? 'grid-cols-1'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
)

// ── Modals ───────────────────────────────────────────────────────────────────
const showForm = ref(false)
const editing = ref(null)
const formResetKey = ref(0)
const progressEntry = ref(null)
const showProgress = ref(false)
const confirmDeleteEntry = ref(null)

function openAdd() { editing.value = null; showForm.value = true }
function openEdit(entry) { editing.value = entry; showForm.value = true }

async function submitForm({ book, item }) {
  if (editing.value) {
    upsert(await updateBook(editing.value.id, { book, item }))
  } else {
    upsert(await createBook(book, item))
  }
  showForm.value = false
  editing.value = null
}

function openProgress(entry) { progressEntry.value = entry; showProgress.value = true }

// Book detail opens as an overlay (not a page).
const detailId = ref(null)
const showDetail = ref(false)
function openDetail(entry) { detailId.value = entry.id; showDetail.value = true }

const deleting = ref(false)
async function doDelete() {
  const entry = confirmDeleteEntry.value
  if (!entry || deleting.value) return
  deleting.value = true
  try {
    await deleteBook(entry.id)
    remove(entry.id)
    confirmDeleteEntry.value = null
  } catch {
    // Keep the confirm dialog open and the book in the list if the delete failed,
    // rather than optimistically removing it and swallowing the error.
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="relative min-h-screen bg-slate-100 dark:bg-[#0d0d1a] text-slate-900 dark:text-white overflow-x-hidden">
    <BackgroundBlobs />
    <div class="relative z-10">
      <AppHeader>
        <template #left>
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="cursor-pointer flex flex-col justify-center gap-[5px] p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            :title="t('shelf.header.menu')"
          >
            <span class="block w-5 h-0.5 rounded-full bg-current transition-all duration-200" :class="sidebarOpen ? 'rotate-45 translate-y-[7px]' : ''" />
            <span class="block w-5 h-0.5 rounded-full bg-current transition-all duration-200" :class="sidebarOpen ? 'opacity-0 scale-x-0' : ''" />
            <span class="block w-5 h-0.5 rounded-full bg-current transition-all duration-200" :class="sidebarOpen ? '-rotate-45 -translate-y-[7px]' : ''" />
          </button>
          <p class="hidden sm:block text-xs text-slate-500 dark:text-slate-400">{{ t('shelf.header.count', { count: entries.length }) }}</p>
        </template>

        <template #right>
          <!-- Search -->
          <div class="relative">
            <Icon :d="ICONS.search" sw="2" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('shelf.header.search')"
              autocomplete="off"
              class="w-32 sm:w-48 pl-9 pr-3 py-1.5 text-sm bg-black/5 dark:bg-white/8 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg border border-transparent focus:border-indigo-500/50 focus:outline-none focus:bg-white dark:focus:bg-white/12 transition-all duration-200"
            />
          </div>
          <button
            @click="toggleStats"
            :title="showStats ? t('shelf.header.backToList') : t('shelf.header.stats')"
            :class="['cursor-pointer p-2 rounded-lg transition-colors', showStats ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-700' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700']"
          >
            <Icon :d="ICONS.stats" sw="2" class="w-4 h-4" />
          </button>
          <button @click="openSettings" :title="t('shelf.header.settings')" class="group cursor-pointer p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Icon :d="ICONS.cog" sw="2" class="w-4 h-4 nuc-cog" />
          </button>
          <button @click="openAdd" class="group nuc-press cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors">
            <Icon :d="ICONS.plus" sw="2.5" class="w-4 h-4 nuc-pop" />
            <span class="hidden sm:inline">{{ t('shelf.header.add') }}</span>
          </button>
        </template>
      </AppHeader>

      <main class="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-5">
        <ShelfStats v-if="showStats" :entries="entries" :sessions="sessions" :rating-max="settings.ratingMax" />
        <template v-else>
        <!-- Toolbar: one cohesive liquid-glass control bar -->
        <div class="glass rounded-2xl p-2 flex flex-col gap-2.5">
          <!-- Status segmented control + result count -->
          <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1 overflow-x-auto no-scrollbar">
              <div class="inline-flex items-center gap-0.5 bg-black/[0.04] dark:bg-white/5 rounded-xl p-1">
                <button
                  v-for="tab in STATUS_TABS"
                  :key="tab.key"
                  @click="activeStatus = tab.key"
                  :class="[
                    'cursor-pointer whitespace-nowrap px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                    activeStatus === tab.key
                      ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                  ]"
                >
                  {{ tab.label }}
                </button>
              </div>
            </div>
            <span class="hidden sm:block shrink-0 text-xs text-slate-400 dark:text-slate-500 tabular-nums pr-1">
              {{ t('shelf.list.showing', { shown: filtered.length, total: entries.length }) }}
            </span>
          </div>

          <div class="h-px bg-black/[0.06] dark:bg-white/8 -mx-2" />

          <!-- Filters (left) · sort + view (right) -->
          <div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-center gap-1.5 flex-wrap">
              <div class="relative">
                <select v-model="filterGenre" :class="['appearance-none cursor-pointer pl-3 pr-8 max-w-[10rem]', CHIP_BASE, filterGenre ? CHIP_ACTIVE : CHIP_IDLE]">
                  <option value="">{{ t('shelf.filter.allGenres') }}</option>
                  <option v-for="g in genreOptions" :key="g" :value="g">{{ g }}</option>
                </select>
                <Icon :d="ICONS.caretDown" sw="2.5" class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50" />
              </div>
              <div class="relative">
                <select v-model="filterAuthor" :class="['appearance-none cursor-pointer pl-3 pr-8 max-w-[10rem]', CHIP_BASE, filterAuthor ? CHIP_ACTIVE : CHIP_IDLE]">
                  <option value="">{{ t('shelf.filter.allAuthors') }}</option>
                  <option v-for="a in authorOptions" :key="a" :value="a">{{ a }}</option>
                </select>
                <Icon :d="ICONS.caretDown" sw="2.5" class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50" />
              </div>
              <div class="relative">
                <select v-model="filterFormat" :class="['appearance-none cursor-pointer pl-3 pr-8 max-w-[10rem]', CHIP_BASE, filterFormat ? CHIP_ACTIVE : CHIP_IDLE]">
                  <option value="">{{ t('shelf.filter.allFormats') }}</option>
                  <option v-for="f in Object.keys(FORMAT_META)" :key="f" :value="f">{{ t(FORMAT_META[f].i18n) }}</option>
                </select>
                <Icon :d="ICONS.caretDown" sw="2.5" class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50" />
              </div>

              <button
                @click="onlyFavorite = !onlyFavorite"
                :class="['nuc-fav cursor-pointer inline-flex items-center gap-1.5 pl-2.5 pr-3', CHIP_BASE, onlyFavorite ? 'bg-rose-500/15 border-rose-400/40 text-rose-600 dark:text-rose-400' : CHIP_IDLE]"
              >
                <FavoriteHeart :active="onlyFavorite" class="w-4 h-4" />
                {{ t('shelf.filter.favorites') }}
              </button>
              <button
                @click="onlyOwned = !onlyOwned"
                :class="['cursor-pointer inline-flex items-center gap-1.5 pl-2.5 pr-3', CHIP_BASE, onlyOwned ? 'bg-indigo-500/15 border-indigo-400/40 text-indigo-600 dark:text-indigo-400' : CHIP_IDLE]"
              >
                <Icon :d="ICONS.check" sw="2.5" class="w-4 h-4" />
                {{ t('shelf.filter.owned') }}
              </button>

              <button
                v-if="hasFilters"
                @click="clearFilters"
                :title="t('shelf.filter.clear')"
                class="nuc-press cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
              >
                <Icon :d="ICONS.close" sw="2.5" class="w-4 h-4" />
              </button>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Sort: icon buttons; active shows the direction caret inline -->
              <div class="flex items-center gap-0.5">
                <button
                  v-for="s in SORTS"
                  :key="s.key"
                  @click="toggleSort(s.key)"
                  :title="t(s.i18n) + (sortBy === s.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')"
                  :class="['cursor-pointer h-9 px-2 rounded-lg transition-colors inline-flex items-center gap-0.5', sortBy === s.key ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8']"
                >
                  <Icon :d="s.icon" class="w-4 h-4" />
                  <Icon v-if="sortBy === s.key" :d="sortDir === 'asc' ? ICONS.caretUp : ICONS.caretDown" sw="3" class="w-2.5 h-2.5" />
                </button>
              </div>
              <!-- View toggle (segmented) -->
              <div class="flex items-center h-9 bg-black/[0.05] dark:bg-white/5 rounded-lg p-1 gap-0.5">
                <button @click="view = 'grid'" :title="t('shelf.list.grid')" :class="['cursor-pointer h-full px-2.5 rounded-md inline-flex items-center transition-colors', view === 'grid' ? 'text-indigo-600 dark:text-white bg-white dark:bg-white/15 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white']">
                  <Icon :d="ICONS.viewGrid" sw="2" class="w-4 h-4" />
                </button>
                <button @click="view = 'list'" :title="t('shelf.list.list')" :class="['cursor-pointer h-full px-2.5 rounded-md inline-flex items-center transition-colors', view === 'list' ? 'text-indigo-600 dark:text-white bg-white dark:bg-white/15 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white']">
                  <Icon :d="ICONS.viewList" sw="2" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- States -->
        <div v-if="loading" class="text-center py-20 text-slate-400 dark:text-slate-500">{{ t('shelf.state.loading') }}</div>
        <div v-else-if="error" class="text-center py-20">
          <p class="text-red-400 text-sm">{{ t('shelf.state.loadError') }}</p>
          <button @click="load(true)" class="cursor-pointer mt-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline">{{ t('shelf.state.retry') }}</button>
        </div>

        <!-- Empty library -->
        <div v-else-if="!entries.length" class="text-center py-20 flex flex-col items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Icon :d="ICONS.book" sw="1.5" class="w-8 h-8" />
          </div>
          <div>
            <p class="text-lg font-semibold text-slate-900 dark:text-white">{{ t('shelf.empty.title') }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ t('shelf.empty.subtitle') }}</p>
          </div>
          <button @click="openAdd" class="nuc-press cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">{{ t('shelf.empty.cta') }}</button>
        </div>

        <!-- No matches -->
        <div v-else-if="!filtered.length" class="text-center py-20 text-slate-400 dark:text-slate-500">
          <p class="text-sm">{{ t('shelf.empty.noMatches') }}</p>
          <button @click="clearFilters" class="cursor-pointer mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">{{ t('shelf.filter.clear') }}</button>
        </div>

        <!-- Grid / list -->
        <div v-else class="grid gap-3 nuc-stagger" :class="gridClass" style="--nuc-step: 26ms">
          <BookCard
            v-for="entry in filtered"
            :key="entry.id"
            :entry="entry"
            :view="view"
            :rating-max="settings.ratingMax"
            @open="openDetail"
            @edit="openEdit"
            @delete="confirmDeleteEntry = $event"
            @progress="openProgress"
          />
        </div>
        </template>
      </main>

      <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

      <BookDetailModal :show="showDetail" :entry-id="detailId" @close="showDetail = false" @deleted="showDetail = false" />
      <BookFormModal :show="showForm" :initial="editing" :reset-key="formResetKey" @close="showForm = false; editing = null" @submit="submitForm" />
      <ProgressSheet :show="showProgress" :entry="progressEntry" @close="showProgress = false" />
      <SettingsModal :show="settingsOpen" @close="closeSettings" />

      <TemplateModal
        :show="!!confirmDeleteEntry"
        :title="t('shelf.delete.title')"
        :message="t('shelf.delete.message', { title: confirmDeleteEntry?.book?.title })"
        :confirm-label="t('shelf.delete.confirm')"
        :busy="deleting"
        @confirm="doDelete"
        @cancel="confirmDeleteEntry = null"
      />
    </div>
  </div>
</template>
