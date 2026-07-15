<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import TemplateModal from '@core/TemplateModal.vue'
import { useI18n } from '@core/useI18n.js'
import { useRegistry } from '@core/useRegistry.js'
import { usePlugins } from '@core/usePlugins.js'
import { useShelfSettings } from '@/composables/useShelfSettings.js'
import { getProviders } from '@/api/shelf.js'
import { OPEN_OPTIONS, TITLE_FORMATS, DEFAULT_TYPE, buildOpenUrl, OPEN_MEDIUMS } from '@/utils/openTarget.js'
import Icon from './Icon.vue'
import { ICONS } from '@/utils/icons.js'

const { t } = useI18n()
const { isPluginEnabled } = useRegistry()
const props = defineProps({ show: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const { settings, update, setOpenDefault } = useShelfSettings()

// Installed plugins → names, so plugin-contributed UI can name its source in a
// tooltip ("Added by the … plugin"). Purely for the badge; loaded once.
const { plugins: installedPlugins, load: loadInstalledPlugins } = usePlugins()
onMounted(loadInstalledPlugins)
const pluginName = (id) => installedPlugins.value.find((p) => p.id === id)?.name || id
// Puzzle-piece glyph for the "this was added by a plugin" badge (Heroicons).
const PLUGIN_ICON = 'M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.4 48.4 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.036 1.007-1.875 2.25-1.875s2.25.84 2.25 1.875c0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.676.32-3.4.475-5.157.475a.64.64 0 0 1-.657-.643Z'

// ── Import sources ───────────────────────────────────────────────────────────
// The metadata providers searched when adding a book. Some are contributed by
// plugins (p.pluginId) — those are hidden when their plugin is disabled, so
// turning off the manga-source plugin in Profile → Plugins removes it here too.
const providers = ref([])
// Two drafts, committed on Save. Built-in sources are opt-in (`enabled`); plugin
// sources are on by default and opt-OUT (`hidden`) — matching the server.
const enabledProviderIds = ref([])
const hiddenProviderIds = ref([])

const visibleProviders = computed(() =>
  providers.value.filter((p) => !p.pluginId || isPluginEnabled(p.pluginId)))

const isSourceOn = (p) =>
  p.pluginId ? !hiddenProviderIds.value.includes(p.id) : enabledProviderIds.value.includes(p.id)

function toggleSource(p) {
  if (!p.available) return
  if (p.pluginId) {
    // opt-out: on = absent from hidden
    const s = new Set(hiddenProviderIds.value)
    s.has(p.id) ? s.delete(p.id) : s.add(p.id)
    hiddenProviderIds.value = [...s]
  } else {
    // opt-in: on = present in enabled
    const s = new Set(enabledProviderIds.value)
    s.has(p.id) ? s.delete(p.id) : s.add(p.id)
    enabledProviderIds.value = [...s]
  }
}

// One section per medium (openTarget.OPEN_MEDIUMS = built-ins + whatever plugins
// contribute). Built-ins carry an i18n label; plugin mediums carry a literal
// label + pluginId, are shown only while that plugin is enabled, and get a
// badge. Icons keep sections scannable; unknown mediums fall back to the book icon.
const ICON_FOR = { book: ICONS.book, audio: ICONS.audiobook }
const KINDS = computed(() =>
  OPEN_MEDIUMS
    .filter((m) => !m.pluginId || isPluginEnabled(m.pluginId))
    .map((m) => ({ key: m.id, i18n: m.i18n, label: m.label, icon: ICON_FOR[m.id] || ICONS.book, plugin: m.pluginId })))

// Edit a local draft so a Cancel/close leaves the saved defaults untouched.
const blank = (kind) => ({ type: DEFAULT_TYPE[kind] || 'custom', customUrl: '', titleFormat: 'raw' })
const draft = reactive(Object.fromEntries(OPEN_MEDIUMS.map((m) => [m.id, blank(m.id)])))

watch(
  () => props.show,
  (v) => {
    if (!v) return
    for (const { key } of KINDS.value) {
      const d = settings.openDefaults[key] || blank(key)
      draft[key] = { type: d.type, customUrl: d.customUrl || '', titleFormat: d.titleFormat || 'raw' }
    }
    // Seed the import-source drafts from the saved sets, then refresh the list.
    enabledProviderIds.value = [...(settings.providers || ['openlibrary'])]
    hiddenProviderIds.value = [...(settings.hiddenProviders || [])]
    getProviders().then((list) => { providers.value = Array.isArray(list) ? list : [] }).catch(() => {})
  },
  { immediate: true }
)

// Two tabs — the per-medium "Open in" defaults, then import sources. "Open in"
// is first so it's the tab shown on open. Icons are SVG path strings
// (TemplateModal renders them inline).
const tabs = computed(() => [
  { key: 'open', label: t('shelf.open.settingsTitle'), icon: ICONS.externalLink },
  { key: 'sources', label: t('shelf.sources.title'), icon: ICONS.search },
])

// Live preview of what "Open in" will hit, using a familiar sample book.
const SAMPLE = { book: { title: 'The Hobbit', authors: ['J.R.R. Tolkien'] } }
const previewUrl = (kind) => buildOpenUrl(draft[kind], SAMPLE)

function save() {
  for (const { key } of KINDS.value) setOpenDefault(key, draft[key])
  // Persist both import-source drafts (built-in opt-ins + plugin opt-outs).
  update({ providers: [...enabledProviderIds.value], hiddenProviders: [...hiddenProviderIds.value] })
  emit('close')
}
</script>

<template>
  <TemplateModal
    :show="show"
    header
    footer
    :title="t('shelf.settings.title')"
    :tabs="tabs"
    fixed-height
    :confirm-label="t('shelf.open.save')"
    :cancel-label="t('shelf.open.cancel')"
    size="lg"
    body-class="px-5 pb-5 pt-5"
    @confirm="save"
    @cancel="emit('close')"
  >
    <template #default="{ activeTab }">
    <!-- ── Import sources tab ─────────────────────────────────────────────── -->
    <div v-show="activeTab === 'sources'" class="flex flex-col gap-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] p-4">
      <div>
        <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ t('shelf.sources.title') }}</span>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ t('shelf.sources.desc') }}</p>
      </div>
      <p v-if="!visibleProviders.length" class="text-xs text-slate-400 dark:text-slate-500">{{ t('shelf.sources.empty') }}</p>
      <ul v-else class="flex flex-col divide-y divide-black/5 dark:divide-white/8">
        <li v-for="p in visibleProviders" :key="p.id" class="flex items-center gap-3 py-2">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-800 dark:text-white/90 truncate flex items-center gap-1.5">
              <span class="truncate">{{ p.label }}</span>
              <span
                v-if="p.pluginId"
                class="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 cursor-help"
                :title="t('shelf.plugin.addedBy', { name: pluginName(p.pluginId) })"
              >
                <Icon :d="PLUGIN_ICON" sw="1.6" class="w-3 h-3" />{{ t('shelf.plugin.badge') }}
              </span>
            </p>
            <p v-if="!p.available" class="text-[11px] text-amber-600 dark:text-amber-400">{{ t('shelf.sources.needsKey') }}</p>
          </div>
          <button
            type="button" role="switch" :aria-checked="isSourceOn(p)"
            :disabled="!p.available"
            class="relative shrink-0 w-10 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :class="isSourceOn(p) ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-white/15'"
            @click="toggleSource(p)"
          >
            <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" :class="isSourceOn(p) ? 'translate-x-4' : ''" />
          </button>
        </li>
      </ul>
    </div>

    <!-- ── Open in tab ────────────────────────────────────────────────────── -->
    <div v-show="activeTab === 'open'" class="flex flex-col gap-4">
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('shelf.open.settingsDesc') }}</p>

      <div
        v-for="kind in KINDS"
        :key="kind.key"
        class="flex flex-col gap-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] p-4"
      >
        <!-- Section header -->
        <div class="flex items-center gap-2.5">
          <span class="grid place-items-center w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 shrink-0">
            <Icon :d="kind.icon" sw="1.75" class="w-4 h-4" />
          </span>
          <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ kind.i18n ? t(kind.i18n) : kind.label }}</span>
          <span
            v-if="kind.plugin"
            class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 cursor-help"
            :title="t('shelf.plugin.addedBy', { name: pluginName(kind.plugin) })"
          >
            <Icon :d="PLUGIN_ICON" sw="1.6" class="w-3 h-3" />{{ t('shelf.plugin.badge') }}
          </span>
        </div>

        <!-- Destination chips -->
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in OPEN_OPTIONS[kind.key]"
            :key="opt.type"
            type="button"
            @click="draft[kind.key].type = opt.type"
            :class="[
              'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
              draft[kind.key].type === opt.type
                ? 'bg-indigo-600 text-white border-transparent shadow-sm shadow-indigo-600/30'
                : 'bg-white/60 dark:bg-white/8 text-slate-600 dark:text-slate-300 border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-white/15 hover:text-slate-900 dark:hover:text-white',
            ]"
          >
            {{ opt.i18n ? t(opt.i18n) : opt.label }}
          </button>
        </div>

        <!-- Custom URL config — nested panel so it reads as part of the section -->
        <div
          v-if="draft[kind.key].type === 'custom'"
          class="flex flex-col gap-2.5 rounded-lg bg-black/[0.03] dark:bg-black/20 border border-black/5 dark:border-white/10 p-3"
        >
          <input
            v-model="draft[kind.key].customUrl"
            type="url"
            :placeholder="t('shelf.open.customPlaceholder')"
            class="bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-500 dark:text-slate-400 shrink-0">{{ t('shelf.open.titleFormat') }}</label>
            <select v-model="draft[kind.key].titleFormat" class="cursor-pointer flex-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option v-for="fmt in TITLE_FORMATS" :key="fmt.value" :value="fmt.value">{{ t(fmt.i18n) }} — {{ fmt.example }}</option>
            </select>
          </div>
          <p class="text-xs text-slate-400 dark:text-slate-500">{{ t('shelf.open.customHint') }}</p>
          <p v-if="previewUrl(kind.key)" class="text-xs text-slate-500 dark:text-slate-400 truncate">
            <span class="text-slate-400 dark:text-slate-500">{{ t('shelf.open.preview') }}</span>
            <span class="font-mono text-indigo-600 dark:text-indigo-400">{{ previewUrl(kind.key) }}</span>
          </p>
        </div>
      </div>
    </div>
    </template>
  </TemplateModal>
</template>
