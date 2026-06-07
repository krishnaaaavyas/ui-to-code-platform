/**
 * Bounding box calculation for shapes
 */
export function extractBounds(el) {
  if (el.type === "circle" || el.type === "triangle" || el.type === "diamond") {
    const r = el.radius || 60;
    return {
      x: el.x - r,
      y: el.y - r,
      width: r * 2,
      height: r * 2,
    };
  }
  if (el.type === "path" || el.type === "pen" || el.type === "line") {
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

export function isContained(childBounds, parentBounds) {
  const margin = 5;
  return (
    childBounds.x >= parentBounds.x - margin &&
    childBounds.y >= parentBounds.y - margin &&
    childBounds.x + childBounds.width <= parentBounds.x + parentBounds.width + margin &&
    childBounds.y + childBounds.height <= parentBounds.y + parentBounds.height + margin
  );
}

/**
 * Detects text nodes fully contained inside a shape rectangle
 */
export function detectTextInsideShape(shape, elements) {
  const shapeBounds = extractBounds(shape);
  return elements.filter((el) => {
    if (el.type !== "text" || el.id === shape.id) return false;
    const txtBounds = extractBounds(el);
    return isContained(txtBounds, shapeBounds);
  });
}

/**
 * Finds all elements fully contained inside a container shape boundaries
 */
export function findContainedElements(container, elements) {
  const containerBounds = extractBounds(container);
  return elements.filter((el) => {
    if (el.id === container.id) return false;
    const elBounds = extractBounds(el);
    return isContained(elBounds, containerBounds);
  });
}

/**
 * Heuristically groups nodes by alignment, tagging horizontal-row or vertical-column patterns
 */
export function groupByAlignment(nodes) {
  if (nodes.length <= 1) return nodes;

  return nodes.map((node, i) => {
    const nextNode = nodes[i + 1];
    if (nextNode) {
      const dy = Math.abs(node.y - nextNode.y);
      const dx = Math.abs(node.x - nextNode.x);

      if (dy < 15) {
        node.styles = { ...node.styles, alignment: "horizontal-row" };
      } else if (dx < 15) {
        node.styles = { ...node.styles, alignment: "vertical-column" };
      }
    }
    return node;
  });
}

/**
 * Heuristically detects repeated components (grid lists, rows) and annotates pattern tags
 */
export function groupRepeatedPatterns(nodes) {
  const dimensionsMap = {};

  nodes.forEach((node) => {
    if (node.kind === "card" || node.kind === "container") {
      const key = `${Math.round(node.width / 50) * 50}x${Math.round(node.height / 50) * 50}`;
      if (!dimensionsMap[key]) dimensionsMap[key] = [];
      dimensionsMap[key].push(node);
    }
  });

  Object.values(dimensionsMap).forEach((group) => {
    if (group.length > 1) {
      group.forEach((node) => {
        node.styles = { ...node.styles, isRepeatedPattern: true, patternCount: group.length };
      });
    }
  });

  return nodes;
}

/**
 * Constructs the recursive tree layout representation
 */
export function buildNodeTree(document) {
  const elements = (document.elements || []).filter((el) => el.hidden !== true && el.visible !== false);
  const board = document.board || document.boardSettings || { width: 2200, height: 1400, background: "#ffffff" };
  const boardSettings = {
    boardWidth: board.width ?? board.boardWidth ?? 2200,
    boardHeight: board.height ?? board.boardHeight ?? 1400,
    backgroundColor: board.background ?? board.backgroundColor ?? "#ffffff"
  };

  const boundsMap = new Map();
  elements.forEach((el) => {
    boundsMap.set(el.id, extractBounds(el));
  });

  const containers = elements.filter((el) => el.type === "rect" || el.type === "rectangle");
  const sortedContainers = [...containers].sort((a, b) => {
    const boxA = boundsMap.get(a.id);
    const boxB = boundsMap.get(b.id);
    return boxA.width * boxA.height - boxB.width * boxB.height;
  });

  const parentMap = new Map();
  const childrenMap = new Map();

  sortedContainers.forEach((parent) => {
    const parentBounds = boundsMap.get(parent.id);
    childrenMap.set(parent.id, []);

    elements.forEach((child) => {
      if (child.id === parent.id) return;
      if (parentMap.has(child.id)) return;

      const childBounds = boundsMap.get(child.id);
      if (isContained(childBounds, parentBounds)) {
        parentMap.set(child.id, parent.id);
        childrenMap.get(parent.id).push(child);
      }
    });
  });

  const rootElements = elements.filter((el) => !parentMap.has(el.id));

  const buildNode = (el) => {
    const bounds = boundsMap.get(el.id);
    const childrenElements = childrenMap.get(el.id) || [];

    let kind = "container";
    if (el.type === "text") {
      kind = "text";
    } else if (el.type === "image") {
      kind = "image";
    } else if (el.type === "line" || el.type === "path" || el.type === "pen") {
      kind = "icon";
    }

    if ((el.type === "rect" || el.type === "rectangle") && childrenElements.length === 1 && childrenElements[0].type === "text") {
      const parentB = boundsMap.get(el.id);
      if (parentB.height < 90 && parentB.width < 320) {
        kind = "button";
      }
    }

    if ((el.type === "rect" || el.type === "rectangle") && kind !== "button") {
      const parentB = boundsMap.get(el.id);
      if (parentB.height >= 30 && parentB.height <= 60 && parentB.width >= 100 && parentB.width <= 450 && (el.fill === "transparent" || el.fill === "#ffffff" || el.fill === "#fff")) {
        kind = "input";
      }
    }

    if (el.type === "rect" || el.type === "rectangle") {
      const parentB = boundsMap.get(el.id);
      if (parentB.y < 120 && parentB.width > boardSettings.boardWidth * 0.7 && parentB.height < 100) {
        kind = "navbar";
      } else if (parentB.width > boardSettings.boardWidth * 0.7 && parentB.height > 250 && parentB.y < 400) {
        kind = "hero";
      }
    }

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
      node.url = el.src || el.url;
    }

    if (kind === "button" && childrenElements.length === 1) {
      node.text = childrenElements[0].text;
      node.children = [];
    } else if (childrenElements.length > 0) {
      const sortedChildren = [...childrenElements].sort((a, b) => {
        const boundsA = boundsMap.get(a.id);
        const boundsB = boundsMap.get(b.id);
        if (Math.abs(boundsA.y - boundsB.y) < 15) {
          return boundsA.x - boundsB.x;
        }
        return boundsA.y - boundsB.y;
      });

      node.children = sortedChildren.map(buildNode);

      if (node.kind === "container") {
        const hasImage = sortedChildren.some((c) => c.type === "image");
        const hasText = sortedChildren.some((c) => c.type === "text");
        if (hasImage && hasText && bounds.width < 500) {
          node.kind = "card";
        }
      }
    }

    return node;
  };

  const sortedRoot = [...rootElements].sort((a, b) => {
    const boundsA = boundsMap.get(a.id);
    const boundsB = boundsMap.get(b.id);
    if (Math.abs(boundsA.y - boundsB.y) < 20) {
      return boundsA.x - boundsB.x;
    }
    return boundsA.y - boundsB.y;
  });

  let nodes = sortedRoot.map(buildNode);

  nodes = groupByAlignment(nodes);
  nodes = groupRepeatedPatterns(nodes);

  return {
    page: {
      width: boardSettings.boardWidth,
      height: boardSettings.boardHeight,
      backgroundColor: boardSettings.backgroundColor,
    },
    nodes,
  };
}

export function transformCanvasToSchema(document) {
  return buildNodeTree(document);
}
