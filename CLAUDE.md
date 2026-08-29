# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Whiteboard designer ("UI to Code"): a Konva canvas editor whose drawings are converted into React + Tailwind source code by an LLM pipeline. Two independent npm packages — `client/` (React 19 + Vite, TypeScript, ESM) and `server/` (Express 5, CommonJS). There is no root package.json; every command runs from one of those two directories.

## Commands

```bash
# server (from server/)
npm run dev                       # nodemon, ignores src/db/ so the SQLite file doesn't restart-loop
npm start                         # node src/index.js
npm test                          # jest --runInBand --forceExit  (~50s)
npx jest -t "should register user A"   # single test by name
npx jest src/test/backend.test.js      # single file

# client (from client/)
npm run dev                       # vite dev server on :5173
npm run build                     # vite build
npm run lint                      # eslint

# full stack
docker-compose up --build         # postgres + server + client + nginx gateway on :80
```

CI (`.github/workflows/ci.yml`) runs `npm ci` + lint + test on `server/`, and `npm ci` + lint + build on `client/`. Both jobs use `--if-present`, so the `server` lint step is a silent no-op (no lint script exists).

### Test environment caveats

`server/src/test/backend.test.js` is the only test file. It sets `NODE_ENV=test` and both JWT secrets at the top of the file before requiring `app`, which switches the DB layer to in-memory SQLite and makes `rateLimiter` a pass-through. It also exercises `POST /api/ai/generate`; if `OPENAI_API_KEY` is present in `server/.env` the test makes real OpenAI calls (they fail over to the deterministic fallback, which is what the assertions check, but it costs time and tokens).

## Architecture

### Storage: one query interface, two backends

`server/src/db/database.js` exports `query(sql, params)` and `runTransaction(cb)`. Postgres is used when `DATABASE_URL` is set; otherwise `better-sqlite3` (file `src/db/sqlite.db`, or `:memory:` under `NODE_ENV=test`) with tables created on startup.

**Write all SQL in Postgres dialect** — lowercase, `$1` placeholders, `now()`, `returning *`. The SQLite path rewrites those at runtime: `$n` → `?`, `now()` → `datetime('now')`, object params → `JSON.stringify`, and `data` columns are `JSON.parse`d back on read. `returning` is emulated by re-selecting `where id = params[0]`, so **any INSERT/UPDATE using `returning` must pass the row id as the first parameter**. `on conflict ... do update` works on both. The `.json` files in `src/db/` are dead legacy stores — nothing reads them.

### Documents: optimistic locking + version snapshots

`documents.service.js` is the single place that enforces both access control and concurrency:

- Ownership/role is resolved in the same query via `left join document_permissions` — `owner` (row `user_id` match), `editor`, or `viewer`. A user with no row gets **404, not 403**, so unauthorized documents are indistinguishable from missing ones. Viewers get 403 on `update`/`restore`; only owners can `remove`.
- `update` compares the caller's `version` against the stored one and throws `DocumentError(409, ...)` on mismatch. The client (`useAutosave.ts`) reads `e.status === 409`, freezes autosave, and flips `saveStatus` to `"conflict"`.
- A `document_versions` snapshot is written on create, on `manual: true` saves, on every 5th version (`nextVersion % 5 === 0`), and on restore. Restore does not rewind the version counter — it bumps it forward.

Errors thrown as `DocumentError` carry `.status`; `middleware/errorHandler.js` maps them onto the response.

### Auth: in-memory access token + HttpOnly refresh cookie

Access tokens live only in the Zustand store (never persisted); the refresh token is an HttpOnly cookie scoped to `/api/auth` and is also row-tracked in `refresh_tokens` for revocation. `client/src/api/client.ts` is the only fetch wrapper — on a 401 it calls `/auth/refresh` once (guarded by a module-level `isRefreshing` flag), replays the request, and clears auth state on failure. New API modules should go through `request()` rather than calling `fetch` directly.

Env var names: the code uses **`JWT_ACCESS_SECRET`** and `JWT_REFRESH_SECRET` (the README's `JWT_SECRET` is stale). Under `NODE_ENV=production`, `app.js` hard-exits at startup if either secret is under 32 chars or contains the string "secret".

### Realtime

`server/src/realtime/socket.js` authenticates the Socket.IO handshake with the same access token, uses `documentId` as the room name, and validates every payload with Zod. `element.op` re-broadcasts mutations after re-checking write access per event (`verifyWriteAccess`), so socket ops respect the viewer role independently of the REST layer. Permission removal calls `revokeSocketAccess(userId, documentId)` to eject live sockets. Note the client emits `"cursor-move"` in `CanvasBase.tsx` while the server listens for `"cursor.move"` — dot-separated names are the server's convention.

### Design-to-code pipeline

`ai.controller.js` accepts either `{ elements, boardConfig }` or `{ documentId }` and runs:

1. `inferUiSchema.js` — pure heuristics: bounding boxes, containment nesting, then classification into `button`/`input`/`navbar`/`hero`/`card`/`text`/`image`/`icon`/`container` by size and position.
2. `extractDesignTokens.js` — colors, font scale, radii.
3. `normalizeWithLLM.js` — `gpt-4o-mini`, Zod structured output, enriches/reclassifies the AST.
4. `generateCodeWithLLM.js` — `gpt-4o`, Zod structured output, emits `{ files, entryFile, componentTree }`.

Steps 3 and 4 each retry once (temperature 0.2 → 0.4, 30s timeout) and **always degrade to a deterministic fallback rather than throwing** when `OPENAI_API_KEY` is absent or the call fails — so a 200 response does not imply the LLM ran. `refineCodeWithLLM.js` backs `POST /api/ai/refine-code` for iterative edits to already-generated files. `client/src/lib/transformCanvasToSchema.ts` mirrors the same bounds/containment logic on the frontend for preview purposes; changes to the heuristics usually need to land in both.

### Client state and component wiring

`client/src/store/useStore.ts` is one large Zustand store (~850 lines) holding canvas elements, selection, undo/redo history, document metadata, auth, and code-gen results. `serializeDocument()` / `loadDocument()` there define the persisted document shape, which must stay in sync with the Zod schema in `server/src/middleware/validateJson.js` (it accepts both the current `board: {width,height,background}` form and the legacy flat `boardWidth`/`boardHeight`/`backgroundColor` form).

`CanvasBase.tsx` (~1300 lines) owns the Konva stage, socket lifecycle, autosave, and keyboard handling. Panels and toolbars communicate with it through **`window` CustomEvents**, not props or store actions — `trigger-generate-code`, `trigger-refine-code`, `trigger-add-shape`, `trigger-export-png`, `trigger-import-json`, `trigger-zoom-*`, etc. When adding a toolbar action, dispatch a `trigger-*` event and register the listener in the `CanvasBase` effect alongside the existing ones.

### Styling: Tailwind classes in JSX are inert

`tailwindcss` is in `client/package.json` and components are written with utility classes, but **there is no Tailwind build step** — no `tailwind.config`, no `postcss.config`, no `@import "tailwindcss"` in the CSS, and no Tailwind Vite plugin. The built stylesheet contains only the hand-written classes from `App.css` (~1700 lines) and `index.css`. Adding `className="flex gap-2"` produces no styling; add a real class to `App.css` instead. (The `@tailwind` directives inside `CodePreviewPanel.tsx` are part of the Sandpack preview for *generated* code, which loads Tailwind from a CDN — unrelated to this app's own styling.)

`eslint.config.js` only matches `**/*.{js,jsx}`, so the `.ts`/`.tsx` sources are not actually linted; `tsc` is never run either (`strict: false`, `noEmit`) and most store selectors are typed `any`.

## Deployment

`docker-compose.yml` builds `client/` into an nginx image and puts the root `nginx.conf` gateway in front on port 80, proxying `/api/`, `/socket.io/`, and `/public/uploads/` to the server container. Client env vars are **build-time** Vite args (`VITE_API_BASE_URL=/api`, `VITE_SOCKET_URL=/`), so changing them requires a rebuild, not a restart. `RUNBOOK.md` covers rollback, pg_dump backup/restore, and log commands.
