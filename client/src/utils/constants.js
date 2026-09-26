import { ICONS } from './icons.js'

export const STATUSES = ['planned', 'reading', 'on_hold', 'finished']

export const STATUS_META = {
  planned: {
    i18n: 'shelf.status.planned',
    badge: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    card: 'bg-white/70 dark:bg-slate-800/70 border border-white/60 dark:border-white/8',
    accent: 'text-slate-500',
  },
  reading: {
    i18n: 'shelf.status.reading',
    badge: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    card: 'bg-blue-50/80 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-500/50 dark:ring-blue-500/25',
    accent: 'text-blue-500',
  },
  on_hold: {
    i18n: 'shelf.status.on_hold',
    badge: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
    card: 'bg-amber-50/70 dark:bg-amber-900/15 ring-1 ring-inset ring-amber-500/40 dark:ring-amber-500/20',
    accent: 'text-amber-500',
  },
  finished: {
    i18n: 'shelf.status.finished',
    badge: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    card: 'bg-green-50/80 dark:bg-green-900/20 ring-1 ring-inset ring-green-500/50 dark:ring-green-500/25',
    accent: 'text-green-500',
  },
}

export const FORMATS = ['physical', 'ebook', 'audiobook', 'eaudiobook']

export const FORMAT_META = {
  physical: { i18n: 'shelf.format.physical', icon: ICONS.book },
  ebook: { i18n: 'shelf.format.ebook', icon: ICONS.ebook },
  audiobook: { i18n: 'shelf.format.audiobook', icon: ICONS.audiobook },
  eaudiobook: { i18n: 'shelf.format.eaudiobook', icon: ICONS.eaudiobook },
}

export const SORTS = [
  { key: 'title', i18n: 'shelf.sort.title', dir: 'asc', icon: ICONS.sortTitle },
  { key: 'author', i18n: 'shelf.sort.author', dir: 'asc', icon: ICONS.sortAuthor },
  { key: 'added', i18n: 'shelf.sort.added', dir: 'desc', icon: ICONS.sortAdded },
  { key: 'updated', i18n: 'shelf.sort.updated', dir: 'desc', icon: ICONS.refresh },
  { key: 'rating', i18n: 'shelf.sort.rating', dir: 'desc', icon: ICONS.star },
  { key: 'progress', i18n: 'shelf.sort.progress', dir: 'desc', icon: ICONS.checkCircle },
]
