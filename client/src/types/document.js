/**
 * @typedef {'rect' | 'circle' | 'text' | 'pen' | 'image'} ElementType
 */

/**
 * @typedef {Object} CanvasElement
 * @property {string} id - Unique design element id
 * @property {ElementType} type - Visual drawing primitive category
 * @property {number} x - Left origin coordinate offset
 * @property {number} y - Top origin coordinate offset
 * @property {number} [width] - Width bound for rectangular zones
 * @property {number} [height] - Height bound for rectangular zones
 * @property {number} [radius] - Circular radius
 * @property {number} [rotation] - Angle offset parameter
 * @property {string} [fill] - Inner background hex color
 * @property {string} [stroke] - Border border hex color
 * @property {number} [strokeWidth] - Width sizing for lines/pen strokes
 * @property {string} [text] - Text content for labels
 * @property {number} [fontSize] - Typography pixel scale
 * @property {string} [fontFamily] - Font family selection
 * @property {number[]} [points] - Coordinates mapping for freehand drawings
 * @property {string} [src] - Image source url reference
 * @property {boolean} [locked] - Interaction lock flag
 * @property {boolean} [hidden] - Render toggle parameter
 * @property {number} zIndex - Sorting index layer parameter
 */

/**
 * @typedef {Object} CanvasDocument
 * @property {string} [id] - Document UUID
 * @property {string} name - Document name
 * @property {number} version - Database concurrency tracker index
 * @property {Object} board - Master canvas layout parameter constraints
 * @property {number} board.width - Full canvas pixel width
 * @property {number} board.height - Full canvas pixel height
 * @property {string} board.background - Background hex fill code
 * @property {CanvasElement[]} elements - Vector element stack
 * @property {string} [createdAt] - Creation timestamp
 * @property {string} [updatedAt] - Modification timestamp
 */
