import { ref } from 'vue'
import { getEntries } from '@/api/shelf.js'

const entries = ref([])
const loaded = ref(false)
const loading = ref(false)
const error = ref(null)

async function load(force = false) {
  if (loaded.value && !force) return
  loading.value = true
  error.value = null
  try {
    entries.value = await getEntries()
    loaded.value = true
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

function upsert(entry) {
  if (!entry?.id) return
  const i = entries.value.findIndex((e) => e.id === entry.id)
  if (i === -1) entries.value.unshift(entry)
  else entries.value.splice(i, 1, entry)
}

function remove(id) {
  entries.value = entries.value.filter((e) => e.id !== id)
}

function getById(id) {
  return entries.value.find((e) => e.id === id) || null
}

export function useLibrary() {
  return {
    entries,
    loaded,
    loading,
    error,
    load,
    reload: () => load(true),
    upsert,
    remove,
    getById,
  }
}
