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

## Core Features (Phase 2 Integration)

### 1. Secure Authentication & Session Recovery
- **Refresh & Access Token Flow**: Upon login, the client receives a short-lived JSON Web Token (JWT) Access Token (15-minute expiration) in memory and a long-lived Refresh Token (7-day expiration) stored in a secure, `HttpOnly` cookie.
- **Silent Re-authentication**: The client automatically requests a new access token via `/api/auth/refresh` on application startup and whenever an API request fails with a `401 Unauthorized` code, providing a seamless user experience.

### 2. Row-Level Document Ownership
- All CRUD operations on designs check ownership based on the authenticated user's ID.
- Users can only view, edit, list, and delete their own drawings. Bob cannot access Alice's designs even if he knows the document ID.

### 3. Concurrency Protection (Optimistic Locking)
- When loading a document, the client tracks the document's `version` counter.
- Updates request headers verify the client version matches the server database version.
- If another session/tab has saved changes in the meantime, the database rejects the update with a `409 Conflict` HTTP status code. The client UI halts autosaving, displays a warning badge, and alerts the user to reload.

### 4. Debounced Autosave
- The drawing board watches for client changes (moving shapes, renaming layers, updating background colors).
- Any canvas modification triggers a `1.5-second` debounced autosave.
- Visual save badges let the user know when changes are `Saving...`, `✓ Saved`, `⚠ Version Conflict`, or `⚠ Save Failed`.

### 5. Document Version History Snapshots
- Version snapshots are automatically captured:
  1. On explicit **Manual Save** clicks.
  2. Automatically on every **5th** background autosave.
- Users can browse the **Version History** sidebar inside the designs tab, view previous snapshots with timestamps, and restore any previous version of the whiteboard with a single click.

---

## Setup & Running Locally

### Prerequisites
- Node.js (v18+)

### 1. Server Configuration
Navigate to `/server` and create a `.env` file based on `.env.example`:
```env
PORT=4000
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
# Optional: DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
```
Install dependencies and run:
```bash
npm install
npm run dev
```

### 2. Client Configuration
Navigate to `/client`:
```bash
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.
