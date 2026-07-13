// Open-in mediums contributed by installed Shelf plugins — the client half of
// the `shelfOpenTargets` extension point (the server half is `shelfProviders`,
// see server/providers/index.js).
//
// A plugin ships `client/shelfOpenTargets.js` (default export: a medium
// descriptor or an array of them) and declares `extensions.shelfOpenTargets`
// with `target: "shelf"` in its manifest. Shelf globs that fixed filename (so
// unrelated plugin client code is never imported), verifies the manifest, and
// merges the mediums into its open-in system (utils/openTarget.js). Everything
// medium-specific lives in the plugin; Shelf stays plugin-agnostic.
//
// `../../plugins` is the client-dir `plugins` symlink → repo /plugins, mirroring
// how `core` is wired.
const manifests = import.meta.glob('../../plugins/*/nucleus.plugin.json', { eager: true, import: 'default' })
const modules = import.meta.glob('../../plugins/*/client/shelfOpenTargets.js', { eager: true })

const dirOf = (file) => file.match(/\/plugins\/([^/]+)\//)?.[1]

function build() {
  const manifestByDir = {}
  for (const [file, m] of Object.entries(manifests)) manifestByDir[dirOf(file)] = m

  const mediums = []
  for (const [file, mod] of Object.entries(modules)) {
    const dir = dirOf(file)
    const manifest = manifestByDir[dir]
    const targets = Array.isArray(manifest?.target) ? manifest.target : [manifest?.target]
    if (!targets.includes('shelf')) continue
    const exported = mod?.default
    const list = Array.isArray(exported) ? exported : exported ? [exported] : []
    for (const medium of list) {
      if (!medium?.id || !Array.isArray(medium.destinations)) continue
      // pluginId lets the host gate visibility (isPluginEnabled) and badge it.
      mediums.push({ ...medium, pluginId: manifest?.id || dir })
    }
  }
  return mediums
}

// Resolved at load; the plugin set is fixed for a given bundle.
export const pluginOpenMediums = build()
