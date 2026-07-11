<script setup>
import { ref, watch } from 'vue'
import TemplateModal from '@core/TemplateModal.vue'
import { useI18n } from '@core/useI18n.js'

// Create/edit a single note. Content is plain text today (line breaks preserved
// on display); the field is ready for a Markdown editor when core ships one.
const props = defineProps({
  show: { type: Boolean, default: false },
  note: { type: Object, default: null },
})
const emit = defineEmits(['close', 'save'])

const { t } = useI18n()
const title = ref('')
const content = ref('')
const saving = ref(false)

watch(() => props.show, (v) => {
  if (!v) return
  title.value = props.note?.title || ''
  content.value = props.note?.content || ''
  saving.value = false
})

async function submit() {
  if (saving.value) return
  if (!title.value.trim() && !content.value.trim()) return emit('close')
  saving.value = true
  // Parent performs the API call; keep the modal open state simple.
  emit('save', { title: title.value.trim(), content: content.value })
}
</script>

<template>
  <TemplateModal
    :show="show"
    header
    footer
    size="md"
    :title="note ? t('shelf.notes.editTitle') : t('shelf.notes.addTitle')"
    :confirm-label="t('shelf.notes.save')"
    :confirm-disabled="!title.trim() && !content.trim()"
    @confirm="submit"
    @cancel="emit('close')"
  >
    <div class="flex flex-col gap-3">
      <input
        v-model="title"
        type="text"
        :placeholder="t('shelf.notes.titlePlaceholder')"
        class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <textarea
        v-model="content"
        rows="8"
        :placeholder="t('shelf.notes.contentPlaceholder')"
        class="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
    </div>
  </TemplateModal>
</template>
