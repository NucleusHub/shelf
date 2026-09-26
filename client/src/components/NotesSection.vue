<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from '@core/useI18n.js'
import TemplateModal from '@core/TemplateModal.vue'
import TrashIcon from '@core/TrashIcon.vue'
import NoteEditorModal from './NoteEditorModal.vue'
import Icon from './Icon.vue'
import { ICONS } from '@/utils/icons.js'
import { getNotes, createNote, updateNote, deleteNote } from '@/api/shelf.js'
import { fmtDate } from '@/utils/format.js'

const props = defineProps({
  entryId: { type: String, required: true },
})
const emit = defineEmits(['count'])

const { t, locale } = useI18n()

const notes = ref([])
const loading = ref(true)
const editing = ref(null)
const showEditor = ref(false)
const confirmDelete = ref(null)

async function load() {
  loading.value = true
  try {
    notes.value = await getNotes(props.entryId)
  } finally {
    loading.value = false
  }
}

function openNew() { editing.value = null; showEditor.value = true }
function openEdit(note) { editing.value = note; showEditor.value = true }

async function save(data) {
  if (editing.value) {
    const updated = await updateNote(editing.value._id, data)
    notes.value = notes.value.map((n) => (n._id === updated._id ? updated : n))
  } else {
    const { note, notesCount } = await createNote(props.entryId, data)
    notes.value.unshift(note)
    emit('count', notesCount)
  }
  showEditor.value = false
}

async function remove() {
  const note = confirmDelete.value
  confirmDelete.value = null
  const { notesCount } = await deleteNote(note._id)
  notes.value = notes.value.filter((n) => n._id !== note._id)
  emit('count', notesCount)
}

onMounted(load)
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {{ t('shelf.notes.heading') }}
        <span v-if="notes.length" class="text-slate-300 dark:text-slate-600">· {{ notes.length }}</span>
      </h2>
      <button
        type="button"
        @click="openNew"
        class="nuc-press cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
      >
        <Icon :d="ICONS.plus" sw="2" class="w-4 h-4" />
        {{ t('shelf.notes.add') }}
      </button>
    </div>

    <div v-if="loading" class="text-sm text-slate-400 dark:text-slate-500 py-4">{{ t('shelf.state.loading') }}</div>

    <div v-else-if="!notes.length" class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-400 dark:text-slate-500">
      {{ t('shelf.notes.empty') }}
    </div>

    <ul v-else class="flex flex-col gap-2 nuc-stagger" style="--nuc-step: 28ms">
      <li
        v-for="note in notes"
        :key="note._id"
        class="group rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/60 dark:border-white/8 p-3.5"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p v-if="note.title" class="font-medium text-slate-900 dark:text-white text-sm">{{ note.title }}</p>
            <p v-if="note.content" class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words mt-0.5">{{ note.content }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{{ fmtDate(note.updatedAt, locale) }}</p>
          </div>
          <div class="flex gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button type="button" @click="openEdit(note)" :title="t('shelf.notes.edit')" class="nuc-press cursor-pointer p-1.5 rounded text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <Icon :d="ICONS.pencil" class="w-4 h-4" />
            </button>
            <button type="button" @click="confirmDelete = note" :title="t('shelf.notes.delete')" class="nuc-trash nuc-press cursor-pointer p-1.5 rounded text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <TrashIcon class="w-4 h-4" stroke-width="1.75" />
            </button>
          </div>
        </div>
      </li>
    </ul>

    <NoteEditorModal :show="showEditor" :note="editing" @close="showEditor = false" @save="save" />

    <TemplateModal
      :show="!!confirmDelete"
      :title="t('shelf.notes.deleteTitle')"
      :message="t('shelf.notes.deleteMessage')"
      :confirm-label="t('shelf.notes.delete')"
      @confirm="remove"
      @cancel="confirmDelete = null"
    />
  </section>
</template>
