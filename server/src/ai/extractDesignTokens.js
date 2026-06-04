/**
 * Extracts a reusable design token palette from canvas elements.
 * Outputs colors (fills, strokes), fonts, and border radii used across the canvas.
 * @param {Array} elements - Flat list of canvas elements
 * @returns {Object} Design tokens: { colors, fonts, radii }
 */
function extractDesignTokens(elements) {
  const colorSet = new Set();
  const fontSizeSet = new Set();
  const fontFamilySet = new Set();
  const fontWeightSet = new Set();
  const radiusSet = new Set();

  for (const el of elements) {
    if (el.visible === false) continue;

    if (el.fill && el.fill !== "transparent" && el.fill !== "none") {
      colorSet.add(el.fill);
    }
    if (el.stroke && el.stroke !== "transparent" && el.stroke !== "none") {
      colorSet.add(el.stroke);
    }
    if (el.fontSize) {
      fontSizeSet.add(Number(el.fontSize));
    }
    if (el.fontFamily) {
      fontFamilySet.add(el.fontFamily);
    }
    if (el.fontWeight) {
      fontWeightSet.add(el.fontWeight);
    }
    if (el.cornerRadius) {
      radiusSet.add(Number(el.cornerRadius));
    }
  }

  // Build named color tokens sorted by frequency of usage
  const colorUsageMap = {};
  for (const el of elements) {
    if (el.visible === false) continue;
    for (const key of ["fill", "stroke"]) {
      const c = el[key];
      if (c && c !== "transparent" && c !== "none") {
        colorUsageMap[c] = (colorUsageMap[c] || 0) + 1;
      }
    }
  }

  const sortedColors = Array.from(colorSet).sort(
    (a, b) => (colorUsageMap[b] || 0) - (colorUsageMap[a] || 0)
  );

  // Assign semantic names: primary, secondary, accent, neutral...
  const semanticNames = ["primary", "secondary", "accent", "neutral", "surface", "muted"];
  const colors = {};
  sortedColors.forEach((color, i) => {
    const name = semanticNames[i] || `color${i + 1}`;
    colors[name] = color;
  });

  // Font scale: sort ascending
  const fontScale = Array.from(fontSizeSet).sort((a, b) => a - b);

  // Map to named scale tokens (xs, sm, base, lg, xl, 2xl)
  const fontScaleNames = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"];
  const fontSizes = {};
  fontScale.forEach((size, i) => {
    const name = fontScaleNames[i] || `size${i + 1}`;
    fontSizes[name] = `${size}px`;
  });

  return {
    colors,
    fonts: {
      families: Array.from(fontFamilySet),
      sizes: fontSizes,
      weights: Array.from(fontWeightSet),
    },
    radii: Array.from(radiusSet).map((r) => `${r}px`),
  };
}

module.exports = extractDesignTokens;
