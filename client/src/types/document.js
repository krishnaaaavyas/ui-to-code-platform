/**
 * @typedef {Object} BoardSettings
 * @property {number} boardWidth - Width of the whiteboard canvas
 * @property {number} boardHeight - Height of the whiteboard canvas
 * @property {string} backgroundColor - Background hex color of the canvas
 */

/**
 * @typedef {Object} CanvasElement
 * @property {string} id - Unique identifier for the canvas element
 * @property {'rect' | 'circle' | 'triangle' | 'diamond' | 'line' | 'text' | 'path' | 'image'} type - Shape/element drawing type
 * @property {number} x - Left coordinate relative to stage origin
 * @property {number} y - Top coordinate relative to stage origin
 * @property {number} [width] - Width dimension for rectangular nodes
 * @property {number} [height] - Height dimension for rectangular nodes
 * @property {number} [radius] - Radius for circular shapes
 * @property {string} [text] - Text content for label nodes
 * @property {number} [fontSize] - Font size in pixels for text elements
 * @property {string} [fill] - Hex color value for shape backgrounds
 * @property {string} [stroke] - Hex color value for borders or line strokes
 * @property {number} [strokeWidth] - Width of drawing strokes
 * @property {number[]} [points] - Coordinate pairs for custom paths/drawings
 * @property {number} [rotation] - Rotation angle in degrees
 * @property {boolean} visible - Controls rendering of the layer
 * @property {boolean} locked - Prevents editing interactions when active
 * @property {string} name - User-friendly label for hierarchy display
 */

/**
 * @typedef {Object} CanvasDocument
 * @property {BoardSettings} boardSettings - Persistent global canvas parameters
 * @property {CanvasElement[]} elements - Array of active canvas drawings, excluding transient selections or active tool tools
 */
