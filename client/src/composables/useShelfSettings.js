import { reactive, watch } from 'vue'
import { getSettings, saveSettings } from '@/api/shelf.js'
import { DEFAULT_TYPE } from '@/utils/openTarget.js'

// Per-user Shelf preferences (rating scale, default view, enabled import
// providers, and the per-kind "open in" defaults). The server is the source of
// truth so they follow the user across devices; localStorage is a no-flash
// cache so the last-known values render instantly before the server hydrate
// lands. Exposed as a module-level reactive singleton — the settings modal, the
// rating control and the library view all read/write the same live state.
// Mirrors watchlist's useOpenSettings pattern.
const KEY = 'shelf-settings'

// One "open in" target with its fields filled in.
const normalizeTarget = (t, fallbackType) => ({
  type: t?.type || fallbackType,
  customUrl: t?.customUrl || '',
  titleFormat: t?.titleFormat || 'raw',
})
const defaultOpen = () => ({
  book: normalizeTarget(null, DEFAULT_TYPE.book),
  audio: normalizeTarget(null, DEFAULT_TYPE.audio),
})
const DEFAULT = () => ({ ratingMax: 10, defaultView: 'grid', providers: ['openlibrary'], openDefaults: defaultOpen() })

// Merge whatever we loaded/hydrated onto a full default so openDefaults is
// always present and complete (older cached blobs predate it). The rating scale
// is fixed at 10 — any older 5 that lingers in a cache or server doc is coerced
// up (and re-persisted by the save watcher), so books always show 10 stars.
function withDefaults(raw) {
  const base = DEFAULT()
  return {
    ...base,
    ...raw,
    ratingMax: 10,
    openDefaults: {
      book: normalizeTarget(raw?.openDefaults?.book, DEFAULT_TYPE.book),
      audio: normalizeTarget(raw?.openDefaults?.audio, DEFAULT_TYPE.audio),
    },
  }
}

function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw && typeof raw === 'object') return withDefaults(raw)
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
    const server = withDefaults(await getSettings())
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
    // Set the per-medium "open in" default (kind is 'book' | 'audio').
    setOpenDefault(kind, target) {
      touched = true
      settings.openDefaults[kind] = normalizeTarget(target, DEFAULT_TYPE[kind])
    },
  }
}
