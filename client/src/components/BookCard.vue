<script setup>
import { ref, computed } from 'vue'
import confetti from 'canvas-confetti'
import { updateBook } from '@/api/shelf.js'
import { useLibrary } from '@/composables/useLibrary.js'
import { useI18n } from '@core/useI18n.js'
import ContextMenu from '@core/ContextMenu.vue'
import FavoriteHeart from '@core/FavoriteHeart.vue'
import CoverImage from './CoverImage.vue'
import RatingControl from './RatingControl.vue'
import Icon from './Icon.vue'
import { ICONS } from '@/utils/icons.js'
import { STATUSES, STATUS_META } from '@/utils/constants.js'
import { progressPct, authorLabel, seriesLabel } from '@/utils/format.js'
import { useShelfSettings } from '@/composables/useShelfSettings.js'
import { resolveTarget, buildOpenUrl } from '@/utils/openTarget.js'

const props = defineProps({
  entry: { type: Object, required: true },
  view: { type: String, default: 'grid' }, // grid | list
  ratingMax: { type: Number, default: 10 },
})
// Parent owns the detail modal + the edit/delete/progress modals.
const emit = defineEmits(['open', 'edit', 'delete', 'progress'])

const { t } = useI18n()
const { upsert } = useLibrary()
const { settings } = useShelfSettings()

// External "open in" destination for this entry (null for non-openable formats).
const openUrl = computed(() => buildOpenUrl(resolveTarget(props.entry, settings.openDefaults), props.entry))
function openExternal() {
  if (openUrl.value) window.open(openUrl.value, '_blank', 'noopener,noreferrer')
}
// Poster / title click: open the configured external page when there is one,
// otherwise fall back to the detail modal (physical books / no target). The
// detail modal always has its own way in — the ⓘ button and the context menu.
function primary() {
  if (openUrl.value) openExternal()
  else emit('open', props.entry)
}

const isList = computed(() => props.view === 'list')
const book = computed(() => props.entry.book || {})
const pct = computed(() => progressPct(props.entry))
const statusMeta = computed(() => STATUS_META[props.entry.status] || STATUS_META.planned)
const rootRef = ref(null)
const busy = ref(false)

async function patchItem(item, { celebrate = false } = {}) {
  if (busy.value) return
  busy.value = true
  try {
    const updated = await updateBook(props.entry.id, { item })
    upsert(updated)
    if (celebrate) fireConfetti()
  } finally {
    busy.value = false
  }
}

const markFinished = () => patchItem(
  { status: 'finished', finishedReading: props.entry.finishedReading || new Date().toISOString(), currentPage: book.value.pageCount || props.entry.currentPage },
  { celebrate: true },
)
const toggleFavorite = () => patchItem({ favorite: !props.entry.favorite })

// Bottom badge: cycle through the statuses in order (like watchlist).
function cycleStatus() {
  const next = STATUSES[(STATUSES.indexOf(props.entry.status) + 1) % STATUSES.length]
  const item = { status: next }
  if (next === 'finished') {
    item.finishedReading = props.entry.finishedReading || new Date().toISOString()
    if (book.value.pageCount) item.currentPage = book.value.pageCount
  }
  patchItem(item, { celebrate: next === 'finished' })
}

function fireConfetti() {
  const rect = rootRef.value?.getBoundingClientRect()
  if (!rect) return
  confetti({
    particleCount: 70,
    spread: 80,
    origin: { x: (rect.left + rect.width / 2) / innerWidth, y: (rect.top + rect.height / 2) / innerHeight },
    colors: ['#6366f1', '#a78bfa', '#34d399', '#fbbf24', '#f472b6'],
    scalar: 0.85,
    startVelocity: 30,
  })
}

// ── Context menu ─────────────────────────────────────────────────────────────
const menu = ref({ show: false, x: 0, y: 0 })
function openMenu(e) {
  // Keyboard activation (Enter/Space) reports clientX/Y as 0 — anchor to the
  // button instead of flinging the menu to the viewport corner.
  let x = e.clientX
  let y = e.clientY
  if (!x && !y && e.currentTarget?.getBoundingClientRect) {
    const r = e.currentTarget.getBoundingClientRect()
    x = r.right
    y = r.bottom
  }
  menu.value = { show: true, x, y }
}
const menuItems = computed(() => [
  { label: t('shelf.card.details'), icon: ICONS.book, action: () => emit('open', props.entry) },
  ...(openUrl.value ? [{ label: t('shelf.open.openIn'), icon: ICONS.externalLink, action: openExternal }] : []),
  { label: t('shelf.card.updateProgress'), icon: ICONS.checkCircle, action: () => emit('progress', props.entry) },
  { label: props.entry.status === 'finished' ? t('shelf.card.markReading') : t('shelf.card.markFinished'),
    icon: ICONS.checkThin, action: () => (props.entry.status === 'finished' ? patchItem({ status: 'reading' }) : markFinished()) },
  { label: props.entry.favorite ? t('shelf.card.unfavorite') : t('shelf.card.favorite'), iconHeart: true, iconActive: props.entry.favorite, action: toggleFavorite },
  { divider: true },
  { label: t('shelf.card.edit'), icon: ICONS.pencil, action: () => emit('edit', props.entry) },
  { label: t('shelf.card.delete'), iconTrash: true, danger: true, action: () => emit('delete', props.entry) },
])
</script>

<template>
  <div
    ref="rootRef"
    class="nuc-lift group relative rounded-xl overflow-hidden shadow-sm"
    :class="[statusMeta.card, isList ? 'flex flex-row' : 'flex flex-col']"
    @contextmenu.prevent="openMenu"
  >
    <!-- Cover — click opens the configured external page (or the detail modal
         when the book has no external target). -->
    <div
      class="group/poster relative shrink-0 overflow-hidden cursor-pointer"
      :class="isList ? 'w-16 sm:w-20 self-stretch' : 'w-full'"
      @click="primary"
      :title="openUrl ? t('shelf.open.openIn') : t('shelf.card.details')"
    >
      <CoverImage :src="book.coverUrl" :alt="book.title" :fill="isList" />

      <!-- Open-in-external affordance — reveals on poster hover (desktop only) -->
      <div
        v-if="openUrl"
        class="pointer-events-none absolute inset-0 hidden sm:flex items-center justify-center bg-black/0 group-hover/poster:bg-black/30 transition-colors"
      >
        <Icon :d="ICONS.externalLink" sw="2" class="w-5 h-5 text-white opacity-0 group-hover/poster:opacity-100 transition-opacity drop-shadow" />
      </div>

      <!-- Details button — the dedicated way into the detail modal now that the
           poster opens externally. Hover-revealed on desktop, always on mobile.
           Hidden in list view, where the tiny cover is already crowded and the
           kebab menu's "Details" is right there. -->
      <button
        v-if="!isList"
        type="button"
        @click.stop="emit('open', entry)"
        :title="t('shelf.card.details')"
        class="nuc-press cursor-pointer absolute bottom-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:bg-black/60 hover:scale-110"
      >
        <Icon :d="ICONS.info" sw="2" class="w-4 h-4" />
      </button>

      <!-- Corner status check (top-left), like watchlist -->
      <!-- finished → solid green, always shown -->
      <div
        v-if="entry.status === 'finished'"
        class="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-green-500 shadow-md flex items-center justify-center"
        :title="t(statusMeta.i18n)"
      >
        <Icon :d="ICONS.check" sw="3" class="w-3.5 h-3.5 text-white" />
      </div>
      <!-- reading → blue badge always shown; swaps to check on hover -->
      <button
        v-else-if="entry.status === 'reading'"
        @click.stop="markFinished"
        :disabled="busy"
        :title="t('shelf.card.markFinished')"
        class="cursor-pointer group/chk absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-blue-500 shadow-md flex items-center justify-center transition-all duration-200 hover:bg-green-500 hover:scale-110 disabled:cursor-wait"
      >
        <Icon :d="ICONS.book" sw="2" class="w-3.5 h-3.5 text-white group-hover/chk:hidden" />
        <Icon :d="ICONS.check" sw="3" class="w-3.5 h-3.5 text-white hidden group-hover/chk:block" />
      </button>
      <!-- planned / on_hold → outline check, hover-reveal; click marks finished -->
      <button
        v-else
        @click.stop="markFinished"
        :disabled="busy"
        :title="t('shelf.card.markFinished')"
        class="cursor-pointer absolute top-1.5 left-1.5 w-7 h-7 rounded-full border-2 border-white/60 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:border-white hover:bg-black/60 hover:scale-110 disabled:cursor-wait"
      >
        <Icon :d="ICONS.check" sw="3" class="w-3.5 h-3.5" />
      </button>

      <!-- Favorite heart (top-right) -->
      <button
        type="button"
        @click.stop="toggleFavorite"
        :disabled="busy"
        :title="entry.favorite ? t('shelf.card.unfavorite') : t('shelf.card.favorite')"
        class="nuc-fav nuc-press cursor-pointer absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        :class="{ '!opacity-100': entry.favorite }"
      >
        <FavoriteHeart :active="entry.favorite" class="w-4 h-4" />
      </button>

      <!-- Progress bar overlay -->
      <div v-if="entry.status !== 'planned' && pct > 0" class="absolute bottom-0 inset-x-0 h-1 bg-black/20">
        <div class="h-full transition-all duration-300" :class="entry.status === 'finished' ? 'bg-green-500' : 'bg-indigo-500'" :style="{ width: `${pct}%` }" />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0 flex flex-col gap-1.5 p-3">
      <div class="flex items-start justify-between gap-1.5">
        <div class="min-w-0">
          <button type="button" @click="primary" :title="openUrl ? t('shelf.open.openIn') : t('shelf.card.details')" class="block text-left font-semibold text-slate-900 dark:text-white text-sm leading-tight line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
            {{ book.title }}
          </button>
          <p v-if="authorLabel(entry)" class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{{ authorLabel(entry) }}</p>
        </div>
        <button
          type="button"
          @click="openMenu"
          :title="t('shelf.card.more')"
          class="nuc-press cursor-pointer shrink-0 -mr-1 -mt-0.5 p-1 rounded text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <Icon :d="ICONS.kebab" fill class="w-4 h-4" />
        </button>
      </div>

      <p v-if="seriesLabel(entry)" class="text-xs text-slate-400 dark:text-slate-400 truncate">{{ seriesLabel(entry) }}</p>

      <p v-if="entry.status === 'reading' && book.pageCount" class="text-xs text-slate-400 dark:text-slate-400">
        {{ t('shelf.card.pageOf', { current: entry.currentPage || 0, total: book.pageCount, pct }) }}
      </p>

      <RatingControl v-if="entry.rating" :model-value="entry.rating" :max="ratingMax" readonly compact size="sm" class="mt-0.5" />

      <div class="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
        <!-- Clickable status badge — cycles status -->
        <button
          type="button"
          @click.stop="cycleStatus"
          :disabled="busy"
          :title="t('shelf.card.cycleStatus')"
          class="cursor-pointer text-xs font-medium px-2 py-0.5 rounded-full transition-opacity hover:opacity-80 disabled:cursor-wait"
          :class="statusMeta.badge"
        >
          {{ t(statusMeta.i18n) }}
        </button>
        <span v-if="entry.notesCount" class="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500" :title="t('shelf.card.notesCount', { count: entry.notesCount })">
          <Icon :d="ICONS.notes" class="w-3.5 h-3.5" />
          {{ entry.notesCount }}
        </span>
      </div>
    </div>

    <ContextMenu :show="menu.show" :x="menu.x" :y="menu.y" :items="menuItems" @close="menu.show = false" />
  </div>
</template>
