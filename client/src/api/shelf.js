import { createApiClient } from '@core/createApiClient.js'

// Thin endpoint map over the shared core REST helper (sends the session cookie,
// shapes errors). Everything the client does goes through here.
const api = createApiClient('/api/shelf')

// ── Library entries (LibraryItem joined with its Book) ───────────────────────
export const getEntries = () => api.get('/entries')
export const getEntry = (id) => api.get(`/books/${id}`)
export const createBook = (book, item) => api.post('/books', { book, item })
export const updateBook = (id, { book, item } = {}) => api.patch(`/books/${id}`, { book, item })
export const deleteBook = (id) => api.del(`/books/${id}`)

// ── Reading sessions ─────────────────────────────────────────────────────────
export const getSessions = () => api.get('/sessions')
export const getBookSessions = (id) => api.get(`/books/${id}/sessions`)
export const logSession = (id, data) => api.post(`/books/${id}/sessions`, data)
export const deleteSession = (sid) => api.del(`/sessions/${sid}`)

// ── Notes ──────────────────────────────────────────────────────────────────
export const getNotes = (id) => api.get(`/books/${id}/notes`)
export const createNote = (id, data) => api.post(`/books/${id}/notes`, data)
export const updateNote = (nid, data) => api.patch(`/notes/${nid}`, data)
export const deleteNote = (nid) => api.del(`/notes/${nid}`)

// ── Settings ─────────────────────────────────────────────────────────────────
export const getSettings = () => api.get('/settings')
export const saveSettings = (data) => api.put('/settings', data)

// ── Import providers ─────────────────────────────────────────────────────────
export const getProviders = () => api.get('/providers')
export const searchProviders = (q) => api.get(`/providers/search?q=${encodeURIComponent(q)}`)

// Cover-image upload lives on the app server's shared /api/upload endpoint.
export async function uploadCover(file) {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form })
  if (!res.ok) throw new Error('Upload failed')
  return (await res.json()).url
}
