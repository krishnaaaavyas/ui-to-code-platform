# Canvas Designer

A lightweight React + Vite visual designer for creating and editing canvas elements in the browser.

This project demonstrates an interactive editor built with `react-konva`, `zustand`, and `lucide-react` to manage drawing tools, canvas editing, and property controls.

## Features

- Add and manipulate canvas elements:
  - rectangle
  - circle
  - text
  - freehand pen strokes
- Select and move objects on the canvas
- Resize and transform selected elements via Konva transformer controls
- Edit element appearance with fill and stroke color controls
- Delete selected canvas elements
- Responsive layout with toolbar, canvas stage, and property panel

## Project structure

- `src/main.jsx` — React app entry point
- `src/App.jsx` — application layout and page structure
- `src/components/canvas/ToolBar.jsx` — tool and color selection UI
- `src/components/canvas/DesignerCanvas.jsx` — Konva canvas rendering and interaction logic
- `src/components/canvas/PropertiesPanel.jsx` — selected element property controls
- `src/store/useStore.js` — global state management using Zustand

## Getting started

### Prerequisites

- Node.js 18+ or compatible version
- npm or yarn

### Install dependencies

```bash
cd client
npm install
```

### Run the development server

```bash
npm run dev
```

Open the local development URL shown in the terminal to view the app.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Technical details

- Uses `react-konva` for performant canvas rendering and user interaction
- Centralized state is stored in Zustand with support for:
  - current tool selection
  - active color
  - element list
  - selection state
- The toolbar controls the active drawing mode and current accent color
- The canvas stage handles click, selection, drag, and transform events
- The properties panel allows live updates to the selected element

## Notes

- The `server/` folder currently contains server dependency metadata only and does not include an implemented backend API in this workspace.
- The canvas currently creates elements on an empty click and supports drag/transform only while the `select` tool is active.

## Improvements

Potential enhancements include:

- text editing directly on the canvas
- undo / redo history
- element snapping and alignment guides
- save / load canvas JSON state
- backend persistence for shared designs
