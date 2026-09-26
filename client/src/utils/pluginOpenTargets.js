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
      mediums.push({ ...medium, pluginId: manifest?.id || dir })
    }
  }
  return mediums
}

export const pluginOpenMediums = build()
