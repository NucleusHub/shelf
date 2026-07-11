import { ref } from 'vue'
import { getEntries } from '@/api/shelf.js'

// Module-level singleton store for the library — the same reactive `entries`
// array is shared by the list, the detail page and the stats page, so a change
// made anywhere (log progress, rate, favorite, delete) is reflected everywhere
// without prop threading or refetching. Mirrors the repo's useX() convention.
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

// Insert or replace an entry in place (new books go to the front).
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
