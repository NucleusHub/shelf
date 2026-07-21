// Book indicators contributed by installed plugins — small badges a plugin can
// hang on each Shelf card. A plugin targeting `shelf` ships
// `client/shelfIndicator.vue` (a component that takes an `entry` prop); we glob
// that fixed filename (so unrelated plugin client code is never imported),
// verify the manifest target, and expose the components. The host renders the
// enabled ones — gating on isPluginEnabled(pluginId) — in BookCard.vue.
//
// Mirrors the pluginOpenTargets pattern. `../../plugins` is the client-dir
// `plugins` symlink → repo /plugins, wired like `core`.
import { defineAsyncComponent } from 'vue'

const manifests = import.meta.glob('../../plugins/*/nucleus.plugin.json', { eager: true, import: 'default' })
const modules = import.meta.glob('../../plugins/*/client/shelfIndicator.vue')

const dirOf = (file) => file.match(/\/plugins\/([^/]+)\//)?.[1]

function build() {
  const manifestByDir = {}
  for (const [file, m] of Object.entries(manifests)) manifestByDir[dirOf(file)] = m

  const out = []
  for (const [file, loader] of Object.entries(modules)) {
    const dir = dirOf(file)
    const manifest = manifestByDir[dir]
    const targets = Array.isArray(manifest?.target) ? manifest.target : [manifest?.target]
    if (!targets.includes('shelf')) continue
    out.push({ pluginId: manifest?.id || dir, component: defineAsyncComponent(loader) })
  }
  return out
}

// Resolved at load; the plugin set is fixed for a given bundle.
export const shelfIndicators = build()
