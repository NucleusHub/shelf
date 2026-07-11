<script setup>
import { reactive, watch } from 'vue'
import TemplateModal from '@core/TemplateModal.vue'
import { useI18n } from '@core/useI18n.js'
import { useShelfSettings } from '@/composables/useShelfSettings.js'
import { OPEN_OPTIONS, TITLE_FORMATS, DEFAULT_TYPE, buildOpenUrl } from '@/utils/openTarget.js'
import Icon from './Icon.vue'
import { ICONS } from '@/utils/icons.js'

const { t } = useI18n()
const props = defineProps({ show: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const { settings, setOpenDefault } = useShelfSettings()

// One section per medium; each governs two formats. Icons keep them scannable.
const KINDS = [
  { key: 'book', label: 'shelf.open.books', icon: ICONS.book },
  { key: 'audio', label: 'shelf.open.audiobooks', icon: ICONS.audiobook },
]

// Edit a local draft so a Cancel/close leaves the saved defaults untouched.
const blank = (kind) => ({ type: DEFAULT_TYPE[kind], customUrl: '', titleFormat: 'raw' })
const draft = reactive({ book: blank('book'), audio: blank('audio') })

watch(
  () => props.show,
  (v) => {
    if (!v) return
    for (const { key } of KINDS) {
      const d = settings.openDefaults[key]
      draft[key] = { type: d.type, customUrl: d.customUrl || '', titleFormat: d.titleFormat || 'raw' }
    }
  },
  { immediate: true }
)

// Live preview of what "Open in" will hit, using a familiar sample book.
const SAMPLE = { book: { title: 'The Hobbit', authors: ['J.R.R. Tolkien'] } }
const previewUrl = (kind) => buildOpenUrl(draft[kind], SAMPLE)

function save() {
  for (const { key } of KINDS) setOpenDefault(key, draft[key])
  emit('close')
}
</script>

<template>
  <TemplateModal
    :show="show"
    header
    footer
    :title="t('shelf.open.settingsTitle')"
    :confirm-label="t('shelf.open.save')"
    :cancel-label="t('shelf.open.cancel')"
    size="lg"
    body-class="px-5 pb-5 pt-5"
    @confirm="save"
    @cancel="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.open.settingsDesc') }}</p>

      <div
        v-for="kind in KINDS"
        :key="kind.key"
        class="flex flex-col gap-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] p-4"
      >
        <!-- Section header -->
        <div class="flex items-center gap-2.5">
          <span class="grid place-items-center w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 shrink-0">
            <Icon :d="kind.icon" sw="1.75" class="w-4 h-4" />
          </span>
          <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ t(kind.label) }}</span>
        </div>

        <!-- Destination chips -->
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in OPEN_OPTIONS[kind.key]"
            :key="opt.type"
            type="button"
            @click="draft[kind.key].type = opt.type"
            :class="[
              'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
              draft[kind.key].type === opt.type
                ? 'bg-indigo-600 text-white border-transparent shadow-sm shadow-indigo-600/30'
                : 'bg-white/60 dark:bg-white/8 text-slate-600 dark:text-slate-300 border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-white/15 hover:text-slate-900 dark:hover:text-white',
            ]"
          >
            {{ t(opt.i18n) }}
          </button>
        </div>

        <!-- Custom URL config — nested panel so it reads as part of the section -->
        <div
          v-if="draft[kind.key].type === 'custom'"
          class="flex flex-col gap-2.5 rounded-lg bg-black/[0.03] dark:bg-black/20 border border-black/5 dark:border-white/10 p-3"
        >
          <input
            v-model="draft[kind.key].customUrl"
            type="url"
            :placeholder="t('shelf.open.customPlaceholder')"
            class="bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-500 dark:text-slate-400 shrink-0">{{ t('shelf.open.titleFormat') }}</label>
            <select v-model="draft[kind.key].titleFormat" class="cursor-pointer flex-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option v-for="fmt in TITLE_FORMATS" :key="fmt.value" :value="fmt.value">{{ t(fmt.i18n) }} — {{ fmt.example }}</option>
            </select>
          </div>
          <p class="text-xs text-slate-400 dark:text-slate-500">{{ t('shelf.open.customHint') }}</p>
          <p v-if="previewUrl(kind.key)" class="text-xs text-slate-500 dark:text-slate-400 truncate">
            <span class="text-slate-400 dark:text-slate-500">{{ t('shelf.open.preview') }}</span>
            <span class="font-mono text-indigo-600 dark:text-indigo-400">{{ previewUrl(kind.key) }}</span>
          </p>
        </div>
      </div>
    </div>
  </TemplateModal>
</template>
