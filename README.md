# Whiteboard Designer Platform (UI-to-Code)

A premium, interactive vector whiteboard and design editor platform built using **React (Vite)**, **Konva.js**, and an **Express.js** API.

This platform allows users to draw, manipulate shapes, add text, manage layout layers, and persist drawings to their accounts with robust concurrency, version control, and autosave functionality.

---

## Technical Architecture

The application is structured into two main components:
1. **Frontend Client (`/client`)**: React SPA powered by Vite, Zustand (state management), and Konva.js (HTML5 Canvas rendering engine).
2. **Backend Server (`/server`)**: Express.js REST API supporting user registration, authentication (double JWT tokens), version snapshotting, and row-level document scoping.

### Data Storage Dual-Mode
To guarantee effortless local setup out-of-the-box, the backend features a **dual database layer**:
- **PostgreSQL**: Used if `DATABASE_URL` is configured (see [schema.sql](server/src/db/schema.sql)).
- **JSON File Fallback**: Automatically falls back to writing structured JSON data to `users.json`, `documents.json`, and `versions.json` in the `/server/src/db/` directory if no PostgreSQL database is connected.

---

## Core Features (Phase 2 & 3 Integration)

### 1. Secure Authentication & Session Recovery
- **Refresh & Access Token Flow**: Upon login, the client receives a short-lived JSON Web Token (JWT) Access Token (15-minute expiration) in memory and a long-lived Refresh Token (7-day expiration) stored in a secure, `HttpOnly` cookie.
- **Silent Re-authentication**: The client automatically requests a new access token via `/api/auth/refresh` on application startup and whenever an API request fails with a `401 Unauthorized` code, providing a seamless user experience.

### 2. Row-Level Document Ownership & Sharing
- All CRUD operations check ownership or invite permissions.
- **Access Roles**: Users can invite other accounts as **Viewers** or **Editors** using their email via the "Share Design" widget.
- **Viewer Restrictions**: Viewer sessions can load and watch edits in real time, but are locked out of canvas modifications, shape drags, board resizes, background adjustments, text addition, line drawing, and version restoration.

### 3. Real-Time Collaboration & Sockets
- Built using **Socket.IO** (port 4000) securing handshakes via JWT tokens.
- **Collaborator Cursor Tracking**: Broadcasts mouse cursor moves and updates user-colored cursor overlays displaying other users' emails.
- **Live Presence Header**: Renders an avatar stack showing who is currently editing the whiteboard.
- **Op Syncing**: Propagates additions, shape moves, sizing edits, layer order changes, and canvas resizing instantly across all collaborators in the room.

### 4. Concurrency Protection (Optimistic Locking)
- When loading a document, the client tracks the document's `version` counter.
- Updates request headers verify the client version matches the server database version.
- If another session/tab has saved changes in the meantime, the database rejects the update with a `409 Conflict` HTTP status code. The client UI halts autosaving, displays a warning badge, and alerts the user to reload.

### 5. Debounced Autosave
- The drawing board watches for client changes (moving shapes, renaming layers, updating background colors).
- Any canvas modification triggers a `1.5-second` debounced autosave.
- Visual save badges let the user know when changes are `Saving...`, `✓ Saved`, `⚠ Version Conflict`, or `⚠ Save Failed`.

### 6. Document Version History Snapshots
- Version snapshots are automatically captured:
  1. On explicit **Manual Save** clicks.
  2. Automatically on every **5th** background autosave.
- Users can browse the **Version History** sidebar inside the designs tab, view previous snapshots with timestamps, and restore any previous version of the whiteboard with a single click.

### 7. Asset Upload Engine
- Supports uploading image files directly inside the Shapes panel.
- Fetches secure presigned PUT URLs, directly uploads binary streams, and registers assets in the database.
- **Mock Fallback**: If AWS S3 credentials are not configured, uploads fall back to streaming binaries locally to `/server/public/uploads` and serving them statically.

---

## Setup & Running Locally

### Prerequisites
- Node.js (v18+)
- Docker and Docker Compose (Optional, for containerized run)

### Local Dev Setup (No Docker)

#### 1. Server Configuration
Navigate to `/server` and create a `.env` file based on `.env.example`:
```env
PORT=4000
JWT_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
# Optional: DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
# Optional: AWS_ACCESS_KEY_ID=...
# Optional: AWS_SECRET_ACCESS_KEY=...
# Optional: S3_BUCKET=...
```
Install dependencies and run:
```bash
npm install
npm run dev
```

#### 2. Client Configuration
Navigate to `/client`:
```bash
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## Docker Compose Deployment (Production Mode)

To spin up the entire production-hardened stack (React Vite Client + Express Backend Server + Nginx Gateway reverse proxy + PostgreSQL Database):

1. From the project root, run:
```bash
docker-compose up --build
```
2. Open `http://localhost/` in your browser.
3. The Nginx gateway handles port 80 routing to proxy static files, API paths, and WebSockets cleanly.

---

## Design-to-Code Pipeline 🚀

The platform includes a complete **AI-powered design-to-code pipeline** that converts canvas drawings into production-ready **React + Tailwind CSS** components.

### Pipeline Architecture

```
Canvas Elements (Konva JSON)
        │
        ▼
[1] inferUiSchema.js      → Spatial analysis, semantic AST (button/card/input/navbar/hero)
        │
        ▼
[2] extractDesignTokens.js → Color palette, typography scale, border radii
        │
        ▼
[3] normalizeWithLLM.js   → GPT-4o-mini structured output (enriches + corrects AST)
        │
        ▼
[4] generateCodeWithLLM.js → GPT-4o structured output (React + Tailwind components)
        │
        ▼
Generated Code (App.jsx, sub-components, optional tailwind.config.js)
```

### How to Enable LLM Code Generation

Add your OpenAI API key to the server `.env`:
```env
OPENAI_API_KEY=sk-...
```

Without the key, the pipeline runs in **fallback mode** — it still infers the UI schema and design tokens, then generates a basic React scaffold without calling the LLM.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/generate` | Full pipeline: canvas → AST → normalize → code |
| `POST` | `/api/ai/schema` | Light mode: canvas → AST + tokens only (no LLM) |

Both endpoints accept:
```json
{
  "elements": [...],
  "boardConfig": { "boardWidth": 2200, "boardHeight": 1400, "backgroundColor": "#ffffff" }
}
```
Or, if working from a saved document:
```json
{ "documentId": "uuid-of-your-document" }
```

### Frontend Usage

1. Draw your UI on the canvas (shapes, text, images).
2. Click the **✦ Generate Code** button in the top-right corner of the canvas.
3. A slide-over drawer opens showing the generated React components with:
   - **Generated Code** tab: Syntax-highlighted files with copy buttons and file-level navigation.
   - **UI Schema** tab: The intermediate semantic AST for inspection/debugging.
   - **Design Tokens** tab: Color swatches and typography scale extracted from the canvas.
4. Download individual files or all files directly from the drawer.

### Semantic Classifications

The heuristic AST builder classifies elements as:

| Kind | Detection heuristic |
|------|---------------------|
| `button` | Small rect (< 320×90px) containing a single text child |
| `input` | Thin rect (30–60px tall) with transparent/white fill |
| `navbar` | Wide rect at the top of the canvas |
| `hero` | Full-width tall rect |
| `card` | Container holding both image + text children |
| `text` | Konva Text node |
| `image` | Konva Image node |
| `icon` | Pen path / line drawing |
| `container` | Any other rect with children |

