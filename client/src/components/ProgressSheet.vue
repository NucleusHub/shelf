<script setup>
import { ref, computed, watch } from 'vue'
import TemplateModal from '@core/TemplateModal.vue'
import { useI18n } from '@core/useI18n.js'
import { logSession } from '@/api/shelf.js'
import { useLibrary } from '@/composables/useLibrary.js'

// A small, fast "where are you now?" sheet. Enter the page you've reached (and
// optionally how long you read) — it logs a ReadingSession and advances the
// book. Deliberately minimal: two fields and a live progress preview.
const props = defineProps({
  show: { type: Boolean, default: false },
  entry: { type: Object, default: null },
})
const emit = defineEmits(['close', 'logged'])

const { t } = useI18n()
const { upsert } = useLibrary()

const page = ref('')
const minutes = ref('')
const saving = ref(false)
const error = ref('')

const total = computed(() => props.entry?.book?.pageCount || 0)
const previewPct = computed(() => {
  const p = Number(page.value)
  if (!total.value || !Number.isFinite(p)) return null
  return Math.min(100, Math.round((p / total.value) * 100))
})

// Seed with the current page each time it opens.
watch(() => props.show, (v) => {
  if (!v) return
  page.value = props.entry?.currentPage || ''
  minutes.value = ''
  error.value = ''
})

async function save() {
  if (saving.value || !props.entry) return
  const endingPage = Number(page.value)
  if (!Number.isFinite(endingPage) || endingPage < 0) {
    error.value = t('shelf.progress.invalid')
    return
  }
  saving.value = true
  error.value = ''
  try {
    const res = await logSession(props.entry.id, {
      endingPage,
      duration: minutes.value === '' ? null : Number(minutes.value),
    })
    upsert(res.entry)
    emit('logged', res)
    emit('close')
  } catch (e) {
    error.value = e.message || t('shelf.progress.failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <TemplateModal
    :show="show"
    header
    footer
    size="sm"
    :title="t('shelf.progress.title')"
    :description="entry?.book?.title"
    :confirm-label="t('shelf.progress.save')"
    :busy="saving"
    @confirm="save"
    @cancel="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <!-- Current page -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.progress.currentPage') }}</label>
        <div class="flex items-center gap-2">
          <input
            v-model="page"
            type="number"
            min="0"
            inputmode="numeric"
            autofocus
            @keydown.enter.prevent="save"
            class="w-28 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span v-if="total" class="text-sm text-slate-400 dark:text-slate-500">{{ t('shelf.progress.ofPages', { total }) }}</span>
        </div>
      </div>

      <!-- Live preview bar -->
      <div v-if="previewPct !== null" class="flex flex-col gap-1.5">
        <div class="flex justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>{{ t('shelf.progress.preview') }}</span>
          <span class="tabular-nums">{{ previewPct }}%</span>
        </div>
        <div class="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div class="h-full bg-indigo-500 rounded-full transition-all duration-300" :style="{ width: `${previewPct}%` }" />
        </div>
      </div>

      <!-- Optional minutes -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.progress.minutes') }} <span class="text-slate-400 dark:text-slate-600">· {{ t('shelf.progress.optional') }}</span></label>
        <input
          v-model="minutes"
          type="number"
          min="0"
          inputmode="numeric"
          :placeholder="t('shelf.progress.minutesPlaceholder')"
          @keydown.enter.prevent="save"
          class="w-28 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    </div>
  </TemplateModal>
</template>
