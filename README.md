# Shelf

A personal book library and reading tracker for Nucleus. Auto-discovered via
`nucleus.app.json` — drop this repo into `apps/shelf/`, run `infra/dev` (or
`infra/production`), and it appears in the hub, served at `/shelf`.

Shelf is **not** an ebook reader. It manages books — physical, ebook, audiobook,
or borrowed — and tracks how you read them: progress, ratings, notes, reading
sessions and statistics.

- **Client** — Vite + Vue 3, dev port `5181`, uses the shared `@core` components
  (`BackgroundBlobs`, `AuthGuard`, `AppHeader`, `TemplateModal`, `ContextMenu`,
  `FavoriteHeart`) and the `@core/assets/motion.css` motion vocabulary.
- **Server** — Express + Mongo, port `3010`, API under `/api/shelf`. Cover images
  are uploaded to a named volume and served from `/uploads`.

## Data model

Four cleanly separated collections, all scoped to the signed-in profile:

- **Book** — the work itself (title, authors, series, genres, cover, ISBN …).
- **LibraryItem** — the user's relationship with a book (status, rating,
  favorite, owned, format, current page, timestamps). One per book.
- **ReadingSession** — a single reading event (date, pages read, ending page,
  duration). Drives streaks, pace and history.
- **Note** — a per-book note (title + content, timestamped).

The API joins `LibraryItem` with its `Book` and returns an *entry* — the shape
the whole client works with. An entry's `id` is its `LibraryItem` id.

## Import providers

`server/providers/` defines a small `BookProvider` contract and a registry so
metadata sources can be added later. Open Library ships enabled (no API key);
Google Books and ISBN lookup are registered but disabled stubs — see
`server/providers/index.js`.

## Extension points (not yet implemented)

- **Orbit** — link a local ebook/PDF file to a book (`Book.identifiers.orbit`).
- **AI** — summarize notes, answer questions, generate reading insights.
- **Collections**, yearly goals, barcode scanner, recommendations — the model is
  kept extensible for these.

The `client/core`, `client/widgets` and `server/core` symlinks point at the
monorepo so `@core/*`, `@widgets-core/*` and the shared server auth resolve.
