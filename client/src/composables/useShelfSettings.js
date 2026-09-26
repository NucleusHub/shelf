import { reactive, watch } from 'vue'
import { getSettings, saveSettings } from '@/api/shelf.js'
import { DEFAULT_TYPE } from '@/utils/openTarget.js'

const KEY = 'shelf-settings'

const normalizeTarget = (t, fallbackType) => ({
  type: t?.type || fallbackType,
  customUrl: t?.customUrl || '',
  titleFormat: t?.titleFormat || 'raw',
})
const defaultOpen = () => ({
  book: normalizeTarget(null, DEFAULT_TYPE.book),
  audio: normalizeTarget(null, DEFAULT_TYPE.audio),
})
const DEFAULT = () => ({ ratingMax: 10, defaultView: 'grid', providers: ['openlibrary'], hiddenProviders: [], openDefaults: defaultOpen() })

function withDefaults(raw) {
  const base = DEFAULT()
  return {
    ...base,
    ...raw,
    ratingMax: 10,
    hiddenProviders: Array.isArray(raw?.hiddenProviders) ? raw.hiddenProviders : [],
    openDefaults: (() => {
      const rawOpen = raw?.openDefaults || {}
      const out = {
        book: normalizeTarget(rawOpen.book, DEFAULT_TYPE.book),
        audio: normalizeTarget(rawOpen.audio, DEFAULT_TYPE.audio),
      }
      for (const [k, v] of Object.entries(rawOpen)) {
        if (k === 'book' || k === 'audio') continue
        out[k] = normalizeTarget(v, DEFAULT_TYPE[k] || 'custom')
      }
      return out
    })(),
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
    setOpenDefault(kind, target) {
      touched = true
      settings.openDefaults[kind] = normalizeTarget(target, DEFAULT_TYPE[kind])
    },
  }
}
