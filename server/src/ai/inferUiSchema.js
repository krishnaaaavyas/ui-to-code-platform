function getBounds(el) {
  if (el.type === "circle" || el.type === "triangle" || el.type === "diamond") {
    const r = el.radius || 60;
    return {
      x: el.x - r,
      y: el.y - r,
      width: r * 2,
      height: r * 2,
    };
  }
  if (el.type === "path") {
    if (!el.points || el.points.length === 0) {
      return { x: el.x || 0, y: el.y || 0, width: 0, height: 0 };
    }
    const xs = el.points.filter((_, i) => i % 2 === 0);
    const ys = el.points.filter((_, i) => i % 2 === 1);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    return {
      x: xMin,
      y: yMin,
      width: xMax - xMin,
      height: yMax - yMin,
    };
  }
  return {
    x: el.x || 0,
    y: el.y || 0,
    width: el.width || 120,
    height: el.height || 120,
  };
}

function isContained(c, p) {
  // Allow a tiny margin of 5px overflow for loose positioning
  const margin = 5;
  return (
    c.x >= p.x - margin &&
    c.y >= p.y - margin &&
    c.x + c.width <= p.x + p.width + margin &&
    c.y + c.height <= p.y + p.height + margin
  );
}

/**
 * Heuristically infers a semantic UI Schema / Design AST from flat canvas elements.
 * @param {Array} elements Flat list of Konva drawings
 * @param {Object} boardConfig Width, height, and background color of board
 * @returns {Object} Structured UI Schema
 */
function inferUiSchema(elements, boardConfig = {}) {
  const visibleElements = elements.filter((el) => el.visible !== false);
  
  // Calculate bounding boxes for all elements
  const boundsMap = new Map();
  visibleElements.forEach((el) => {
    boundsMap.set(el.id, getBounds(el));
  });

  // Identify all container shapes (rectangles)
  const containers = visibleElements.filter((el) => el.type === "rect" || el.type === "rectangle");
  
  // Sort containers by area ascending (smallest first) to handle nested layout hierarchies correctly
  const sortedContainers = [...containers].sort((a, b) => {
    const boxA = boundsMap.get(a.id);
    const boxB = boundsMap.get(b.id);
    return boxA.width * boxA.height - boxB.width * boxB.height;
  });

  // Track parent-child relationships
  const parentMap = new Map(); // childId -> parentId
  const childrenMap = new Map(); // parentId -> array of child elements

  sortedContainers.forEach((parent) => {
    const parentBounds = boundsMap.get(parent.id);
    childrenMap.set(parent.id, []);

    visibleElements.forEach((child) => {
      if (child.id === parent.id) return;
      if (parentMap.has(child.id)) return; // already placed in a tighter child container

      const childBounds = boundsMap.get(child.id);
      if (isContained(childBounds, parentBounds)) {
        parentMap.set(child.id, parent.id);
        childrenMap.get(parent.id).push(child);
      }
    });
  });

  // The root nodes are elements that do not have a parent container
  const rootElements = visibleElements.filter((el) => !parentMap.has(el.id));

  // Recursive formatter to build semantic UINode AST
  const buildNode = (el) => {
    const bounds = boundsMap.get(el.id);
    const childrenElements = childrenMap.get(el.id) || [];
    
    // Classify node type semantically
    let kind = "container";
    if (el.type === "text") {
      kind = "text";
    } else if (el.type === "image") {
      kind = "image";
    } else if (el.type === "line" || el.type === "path") {
      kind = "icon"; // path drawings are usually icons/decorations
    }

    // Heuristic: If a small rect contains a single text element, it's a button
    if ((el.type === "rect" || el.type === "rectangle") && childrenElements.length === 1 && childrenElements[0].type === "text") {
      const parentB = boundsMap.get(el.id);
      if (parentB.height < 90 && parentB.width < 320) {
        kind = "button";
      }
    }

    // Heuristic: If a rect has a label above it, or text placeholder inside it, and is typical input aspect ratio, it could be an input
    if ((el.type === "rect" || el.type === "rectangle") && kind !== "button") {
      const parentB = boundsMap.get(el.id);
      // Small thin outline rectangle
      if (parentB.height >= 30 && parentB.height <= 60 && parentB.width >= 100 && parentB.width <= 450 && el.fill === "transparent" || el.fill === "#ffffff" || el.fill === "#fff") {
        kind = "input";
      }
    }

    // Gather styles
    const styles = {
      backgroundColor: el.fill || undefined,
      color: el.type === "text" ? el.fill : (el.stroke || undefined),
      borderColor: el.stroke || undefined,
      borderRadius: el.cornerRadius || undefined,
      fontSize: el.fontSize || undefined,
      fontWeight: el.fontWeight || undefined,
    };

    const node = {
      id: el.id,
      kind,
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      styles,
      name: el.name || el.type,
    };

    if (el.type === "text") {
      node.text = el.text;
    }

    if (el.type === "image") {
      node.url = el.url;
    }

    // If it's a button, compress text as node property instead of child
    if (kind === "button" && childrenElements.length === 1) {
      node.text = childrenElements[0].text;
      node.children = [];
    } else if (childrenElements.length > 0) {
      // Sort children reading order: top-to-bottom, then left-to-right
      const sortedChildren = [...childrenElements].sort((a, b) => {
        const boundsA = boundsMap.get(a.id);
        const boundsB = boundsMap.get(b.id);
        if (Math.abs(boundsA.y - boundsB.y) < 15) {
          return boundsA.x - boundsB.x;
        }
        return boundsA.y - boundsB.y;
      });
      node.children = sortedChildren.map(buildNode);
      
      // If it contains kids, mark container as a card/section semantically
      if (kind === "container") {
        const hasImage = sortedChildren.some((c) => c.type === "image");
        const hasText = sortedChildren.some((c) => c.type === "text");
        if (hasImage && hasText && bounds.width < 500) {
          kind = "card";
        }
      }
    }

    return node;
  };

  // Sort root nodes in natural layout reading order
  const sortedRoot = [...rootElements].sort((a, b) => {
    const boundsA = boundsMap.get(a.id);
    const boundsB = boundsMap.get(b.id);
    if (Math.abs(boundsA.y - boundsB.y) < 20) {
      return boundsA.x - boundsB.x;
    }
    return boundsA.y - boundsB.y;
  });

  return {
    page: {
      width: boardConfig.boardWidth || 2200,
      height: boardConfig.boardHeight || 1400,
      backgroundColor: boardConfig.backgroundColor || "#ffffff",
    },
    nodes: sortedRoot.map(buildNode),
  };
}

module.exports = inferUiSchema;
