/**
 * @typedef {Object} UIStyles
 * @property {string} [backgroundColor] - Extracted design token color for component backgrounds
 * @property {string} [color] - Foreground text or border color token
 * @property {string} [borderColor] - Border outline stroke token
 * @property {number} [borderRadius] - Rounding multiplier mapping
 * @property {number} [fontSize] - Font scale sizing index
 * @property {string} [fontWeight] - Font weight (e.g. bold, semi-bold)
 * @property {string} [alignment] - Layout flex direction (e.g. horizontal-row, vertical-column)
 * @property {boolean} [isRepeatedPattern] - True if this element forms part of a grid/list pattern
 * @property {number} [patternCount] - Size of layout repeating siblings cluster
 */

/**
 * @typedef {Object} UINode
 * @property {string} id - Unique design element id (preserves shape bounds reference)
 * @property {'page' | 'container' | 'text' | 'button' | 'input' | 'image' | 'card' | 'icon' | 'navbar' | 'hero'} kind - Semantic layout division category
 * @property {string} name - Base name representation
 * @property {number} x - Bounding box x-coordinate
 * @property {number} y - Bounding box y-coordinate
 * @property {number} width - Node bounding box width
 * @property {number} height - Node bounding box height
 * @property {UIStyles} styles - Enriched design parameters
 * @property {string} [text] - Text labels or inside shape tags
 * @property {string} [url] - Visual image source url reference
 * @property {string} [placeholder] - Form input placeholders
 * @property {UINode[]} [children] - Recursive layout tree children listing
 */

/**
 * @typedef {Object} UISchema
 * @property {Object} page
 * @property {number} page.width - Configured base width bounds
 * @property {number} page.height - Configured base height bounds
 * @property {string} page.backgroundColor - Page color configuration
 * @property {UINode[]} nodes - Semantic tree nodes representing the mock layout design
 */
