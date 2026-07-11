<script setup>
import { ref, reactive, watch, nextTick, computed } from 'vue'
import TemplateModal from '@core/TemplateModal.vue'
import FavoriteHeart from '@core/FavoriteHeart.vue'
import { useI18n } from '@core/useI18n.js'
import CoverImage from './CoverImage.vue'
import RatingControl from './RatingControl.vue'
import Icon from './Icon.vue'
import { ICONS } from '@/utils/icons.js'
import { searchProviders, uploadCover } from '@/api/shelf.js'
import { useShelfSettings } from '@/composables/useShelfSettings.js'
import { STATUSES, STATUS_META, FORMATS, FORMAT_META } from '@/utils/constants.js'

// Add or edit a book. Title doubles as a metadata search box (typeahead over the
// enabled import providers) — pick a result to autofill everything, or just type
// and fill fields by hand. Cover can come from the search result, a file upload,
// or a pasted URL.
const props = defineProps({
  show: { type: Boolean, default: false },
  initial: { type: Object, default: null },  // an entry (edit) or null (add)
  resetKey: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'submit'])

const { t } = useI18n()
const { settings } = useShelfSettings()
const ratingMax = computed(() => settings.ratingMax)

// Flat working copy; joined list fields (authors/genres) edited as text.
const blank = () => ({
  title: '', subtitle: '', description: '',
  authorsText: '', seriesName: '', seriesPos: '',
  genresText: '', language: '', publisher: '', publishedDate: '',
  pageCount: '', coverUrl: null, isbn: '', identifiers: {},
  status: 'planned', format: 'physical', owned: true, favorite: false,
  rating: null, currentPage: '',
})
const form = reactive(blank())

const results = ref([])
const showDropdown = ref(false)
const searching = ref(false)
const uploading = ref(false)
const showUrlInput = ref(false)
const urlDraft = ref('')
const fileInput = ref(null)
const titleInput = ref(null)
let searchTimer = null

function reset() {
  Object.assign(form, blank())
  if (props.initial) {
    const b = props.initial.book || {}
    Object.assign(form, {
      title: b.title || '', subtitle: b.subtitle || '', description: b.description || '',
      authorsText: (b.authors || []).join(', '),
      seriesName: b.series?.name || '', seriesPos: b.series?.position ?? '',
      genresText: (b.genres || []).join(', '),
      language: b.language || '', publisher: b.publisher || '', publishedDate: b.publishedDate || '',
      pageCount: b.pageCount ?? '', coverUrl: b.coverUrl || null, isbn: b.isbn || '',
      identifiers: b.identifiers || {},
      status: props.initial.status, format: props.initial.format,
      owned: props.initial.owned, favorite: props.initial.favorite,
      rating: props.initial.rating, currentPage: props.initial.currentPage ?? '',
    })
  }
  results.value = []
  showDropdown.value = false
  showUrlInput.value = false
  nextTick(() => titleInput.value?.focus())
}

watch(() => props.show, (v) => { if (v) reset() }, { immediate: true })
watch(() => props.resetKey, () => { if (props.show) reset() })

// ── Metadata search ──────────────────────────────────────────────────────────
function onTitleInput() {
  clearTimeout(searchTimer)
  const q = form.title.trim()
  if (q.length < 2) { results.value = []; showDropdown.value = false; return }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      results.value = (await searchProviders(q)).slice(0, 8)
      showDropdown.value = results.value.length > 0
    } catch {
      results.value = []
      showDropdown.value = false
    } finally {
      searching.value = false
    }
  }, 350)
}

// Delay the close so a click on a result registers before blur hides the list.
function closeDropdown() { setTimeout(() => { showDropdown.value = false }, 150) }

function pickResult(r) {
  showDropdown.value = false
  form.title = r.title || form.title
  form.subtitle = r.subtitle || ''
  form.description = r.description || form.description
  form.authorsText = (r.authors || []).join(', ')
  form.genresText = (r.genres || []).join(', ')
  form.language = r.language || ''
  form.publisher = r.publisher || ''
  form.publishedDate = r.publishedDate || ''
  form.pageCount = r.pageCount ?? ''
  form.isbn = r.isbn || ''
  form.identifiers = { ...(form.identifiers || {}), ...(r.identifiers || {}) }
  if (r.coverUrl) form.coverUrl = r.coverUrl
}

// ── Cover ────────────────────────────────────────────────────────────────────
function triggerUpload() { fileInput.value?.click() }
async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  try { form.coverUrl = await uploadCover(file) } catch {} finally { uploading.value = false; e.target.value = '' }
}
function applyUrl() {
  if (urlDraft.value.trim()) form.coverUrl = urlDraft.value.trim()
  showUrlInput.value = false
  urlDraft.value = ''
}

// ── Submit ───────────────────────────────────────────────────────────────────
const splitList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)
const numOrNull = (v) => (v === '' || v == null ? null : Number(v))

function submit() {
  if (!form.title.trim()) return
  const book = {
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    description: form.description,
    authors: splitList(form.authorsText),
    series: form.seriesName.trim() ? { name: form.seriesName.trim(), position: numOrNull(form.seriesPos) } : null,
    genres: splitList(form.genresText),
    language: form.language.trim(),
    publisher: form.publisher.trim(),
    publishedDate: form.publishedDate.trim(),
    pageCount: numOrNull(form.pageCount),
    coverUrl: form.coverUrl,
    isbn: form.isbn.trim(),
    identifiers: form.identifiers || {},
  }
  const item = {
    status: form.status,
    format: form.format,
    owned: !!form.owned,
    favorite: !!form.favorite,
    rating: form.rating || null,
    currentPage: numOrNull(form.currentPage) || 0,
  }
  emit('submit', { book, item })
}
</script>

<template>
  <TemplateModal
    :show="show"
    header
    footer
    size="xl"
    :title="initial ? t('shelf.form.editTitle') : t('shelf.form.addTitle')"
    :confirm-label="initial ? t('shelf.form.save') : t('shelf.form.add')"
    :confirm-disabled="!form.title.trim()"
    body-class="px-4 sm:px-6 pb-5 pt-3"
    @confirm="submit"
    @cancel="emit('close')"
  >
    <div class="flex flex-col gap-5 sm:flex-row sm:gap-6 items-start">
      <!-- Cover -->
      <div class="w-36 sm:w-44 shrink-0 mx-auto sm:mx-0 flex flex-col gap-2.5">
        <div class="relative rounded-lg overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 transition-colors cursor-pointer" @click="!form.coverUrl && triggerUpload()">
          <CoverImage :src="form.coverUrl" :alt="form.title" />
          <div v-if="uploading" class="absolute inset-0 bg-black/60 flex items-center justify-center">
            <svg class="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8H4z" /></svg>
          </div>
          <div v-if="form.coverUrl && !uploading" class="absolute top-1 right-1 flex flex-col gap-1">
            <button type="button" @click.stop="triggerUpload" :title="t('shelf.form.replaceCover')" class="cursor-pointer bg-black/70 hover:bg-black/90 text-white rounded p-1 transition-colors"><Icon :d="ICONS.refresh" sw="2.5" class="w-3 h-3" /></button>
            <button type="button" @click.stop="form.coverUrl = null" :title="t('shelf.form.removeCover')" class="cursor-pointer bg-black/70 hover:bg-red-600/90 text-white rounded p-1 transition-colors"><Icon :d="ICONS.close" sw="2.5" class="w-3 h-3" /></button>
          </div>
        </div>
        <div class="flex gap-1.5">
          <button type="button" @click="triggerUpload" class="cursor-pointer flex-1 text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors">{{ t('shelf.form.upload') }}</button>
          <button type="button" @click="showUrlInput = !showUrlInput" class="cursor-pointer flex-1 text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors">{{ t('shelf.form.url') }}</button>
        </div>
        <div v-if="showUrlInput" class="flex gap-1.5">
          <input v-model="urlDraft" type="url" placeholder="https://…" @keydown.enter.prevent="applyUrl" class="min-w-0 flex-1 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="button" @click="applyUrl" class="cursor-pointer text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-2.5 transition-colors">{{ t('shelf.form.apply') }}</button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />
      </div>

      <!-- Fields -->
      <div class="flex-1 min-w-0 flex flex-col gap-4">
        <!-- Title with typeahead -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.title') }}</label>
          <div class="relative">
            <input ref="titleInput" v-model="form.title" @input="onTitleInput" @blur="closeDropdown" autocomplete="off" :placeholder="t('shelf.form.titlePlaceholder')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <svg v-if="searching" class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8H4z" /></svg>
            <div v-if="showDropdown" class="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-600 max-h-72 overflow-y-auto">
              <button v-for="(r, i) in results" :key="i" type="button" @mousedown.prevent="pickResult(r)" class="cursor-pointer w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left">
                <img v-if="r.coverUrl" :src="r.coverUrl" class="w-8 h-11 object-cover rounded shrink-0" />
                <div v-else class="w-8 h-11 bg-slate-200 dark:bg-slate-600 rounded shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-slate-900 dark:text-white font-medium truncate">{{ r.title }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ (r.authors || []).join(', ') }}<span v-if="r.publishedDate"> · {{ r.publishedDate }}</span></p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Subtitle + Authors -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.subtitle') }}</label>
            <input v-model="form.subtitle" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.authors') }}</label>
            <input v-model="form.authorsText" :placeholder="t('shelf.form.authorsPlaceholder')" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <!-- Series + position + genres -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="flex flex-col gap-1.5 sm:col-span-1">
            <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.series') }}</label>
            <input v-model="form.seriesName" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.seriesPos') }}</label>
            <input v-model="form.seriesPos" type="number" step="0.5" min="0" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.genres') }}</label>
            <input v-model="form.genresText" :placeholder="t('shelf.form.genresPlaceholder')" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <!-- Publisher, published, pages, language, isbn -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.publisher') }}</label>
            <input v-model="form.publisher" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.published') }}</label>
            <input v-model="form.publishedDate" :placeholder="t('shelf.form.publishedPlaceholder')" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.pages') }}</label>
            <input v-model="form.pageCount" type="number" min="0" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.language') }}</label>
            <input v-model="form.language" :placeholder="t('shelf.form.languagePlaceholder')" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
            <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.isbn') }}</label>
            <input v-model="form.isbn" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.description') }}</label>
          <textarea v-model="form.description" rows="3" class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>

        <!-- Your library section -->
        <div class="border-t border-black/5 dark:border-white/10 pt-4 flex flex-col gap-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.status') }}</label>
              <select v-model="form.status" class="cursor-pointer bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option v-for="s in STATUSES" :key="s" :value="s">{{ t(STATUS_META[s].i18n) }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.format') }}</label>
              <select v-model="form.format" class="cursor-pointer bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option v-for="f in FORMATS" :key="f" :value="f">{{ t(FORMAT_META[f].i18n) }}</option>
              </select>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.form.rating') }}</label>
              <RatingControl v-model="form.rating" :max="ratingMax" size="sm" />
            </div>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input v-model="form.owned" type="checkbox" class="cursor-pointer w-4 h-4 rounded accent-indigo-600" />
              <span class="text-sm text-slate-600 dark:text-slate-300">{{ t('shelf.form.owned') }}</span>
            </label>
            <button
              type="button"
              @click="form.favorite = !form.favorite"
              class="nuc-fav nuc-press cursor-pointer flex items-center gap-2 select-none transition-colors"
              :class="form.favorite ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
            >
              <FavoriteHeart :active="form.favorite" class="w-5 h-5" />
              <span class="text-sm">{{ t('shelf.form.favorite') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </TemplateModal>
</template>
