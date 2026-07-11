import { reactive, watch } from 'vue'
import { getSettings, saveSettings } from '@/api/shelf.js'

// Per-user Shelf preferences (rating scale, default view, enabled import
// providers). The server is the source of truth so they follow the user across
// devices; localStorage is a no-flash cache so the last-known values render
// instantly before the server hydrate lands. Exposed as a module-level reactive
// singleton — the settings modal, the rating control and the library view all
// read/write the same live state. Mirrors watchlist's useOpenSettings pattern.
const KEY = 'shelf-settings'
const DEFAULT = () => ({ ratingMax: 10, defaultView: 'grid', providers: ['openlibrary'] })

function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw && [5, 10].includes(raw.ratingMax)) return { ...DEFAULT(), ...raw }
  } catch {}
  return DEFAULT()
}

const settings = reactive(loadLocal())

let lastSaved = null
let saveTimer = null
let touched = false

watch(
  settings,
  (v) => {
    const json = JSON.stringify(v)
    localStorage.setItem(KEY, json)
    if (json === lastSaved) return
    lastSaved = json
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveSettings({ ...v }).catch(() => {}), 400)
  },
  { deep: true }
)

let hydrated = false
async function hydrate() {
  if (hydrated) return
  hydrated = true
  try {
    const server = await getSettings()
    if (touched) return
    lastSaved = JSON.stringify(server)
    Object.assign(settings, server)
  } catch {
    // Offline / unauthenticated — keep the localStorage-backed values.
  }
}

export function useShelfSettings() {
  hydrate()
  return {
    settings,
    update(partial) {
      touched = true
      Object.assign(settings, partial)
    },
  }
}
