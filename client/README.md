# Canvas Visual Designer & Persistence Backend

An interactive visual designer application built with React, Vite, Konva (`react-konva`), and Zustand, integrated with a Node.js + Express REST API for persistent design storage.

## Features

- **Draw Elements:** Support for Rectangles (rect), Circles, Triangles, Diamonds, Lines, and Freehand Pen Strokes.
- **Layers Panel:** Manipulate elements (visibility toggle, locking, renaming, z-ordering reorder) directly linked to canvas rendering.
- **History Undo/Redo:** Snapshot-based history travel that lets you undo and redo document mutations (shape additions, transformations, background updates, color shifts).
- **Responsive Stage:** Zoom (using panel or mouse wheel) and pan features.
- **REST API Persistence:** Create, read, update, list, and delete canvas documents dynamically.
- **Fallback Database Storage:** Runs out-of-the-box using local JSON file storage (`server/src/db/documents.json`) and supports PostgreSQL integration when `DATABASE_URL` is set.
- **Debounced Autosave:** Automatically saves edits in the background 1.5 seconds after the user stops drawing or transforming elements.
- **Zod request validation:** Ensures incoming requests follow strict document specifications.

---

## Project Structure

```txt
Project/
  client/
    src/
      api/
        documents.js          # REST Client for server requests
      components/
        CanvasBase.jsx        # Stage, pointer handlers, autosave, shortcuts
        SideMenu.jsx          # Panels (Shapes, Text, Stroke, Layers, Designs)
      store/
        useStore.js           # Unified flat Zustand store and history
      App.jsx                 # Layout and mount
      index.css               # Core styling variables
      App.css                 # Designer elements CSS styling
  server/
    src/
      controllers/
        documents.controller.js # Request-response routing handlers
      services/
        documents.service.js   # DB client queries with JSON file fallback
      db/
        client.js             # Postgres pool configuration
        schema.sql            # Postgres database tables script
      middleware/
        validateJson.js       # Zod request validators
        errorHandler.js       # Global JSON error formatter
      app.js                  # Express middleware & server configuration
      index.js                # Server entry listener
    .env.example              # Server environment template
```

---

## Getting Started

### Prerequisites
- Node.js 18+

### Setup Database (Optional)
If you have a PostgreSQL server, create a database and run the schema:
```bash
psql -d your_db_name -f server/src/db/schema.sql
```

### Configure environment
1. Create a `server/.env` file:
   ```bash
   cp server/.env.example server/.env
   ```
2. If you are not using Postgres, leave `DATABASE_URL` blank. The backend will automatically fall back to local JSON file storage (`server/src/db/documents.json`).

### Install Dependencies
Run npm install in both directories:
```bash
# Install frontend dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### Start Development Servers
Run the development scripts:
```bash
# Start Client (runs on http://localhost:5173/)
cd client
npm run dev

# Start Server (runs on http://localhost:4000/)
cd server
npm run dev
```

Open `http://localhost:5173/` in your browser to start design editing!
