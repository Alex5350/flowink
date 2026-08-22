/** Geometry helpers: node sizing and edge anchoring. */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes a node's rendered box. Width defaults wrap the longest line with
 * padding; height grows with the number of lines. Minimums keep single-word
 * nodes from collapsing.
 */
export function measureNode(
  label: string,
  lines: readonly string[],
  x: number,
  y: number,
  width?: number,
  height?: number,
): Box {
  const longest = Math.max(label.length, ...(lines.length ? lines.map((line) => line.length) : [8]));
  const charWidth = 7.2; // 13px monospace, conservative
  const widthDefault = Math.max(160, Math.ceil(longest * charWidth) + 40);
  const heightDefault = Math.max(64, 40 + (1 + lines.length) * 18 + (lines.length > 0 ? 8 : 0));
  return { x, y, width: width ?? widthDefault, height: height ?? heightDefault };
}

/**
 * Finds the nearest facing anchor points between two boxes and returns a path
 * connecting them: straight when aligned, otherwise a gentle cubic curve.
 * `manual` path data overrides this entirely.
 */
export function connectBoxes(a: Box, b: Box, manual?: string): string {
  if (manual) {
    return manual;
  }

  const aLeft = a.x;
  const aRight = a.x + a.width;
  const bLeft = b.x;
  const bRight = b.x + b.width;
  const horizontalGap = Math.max(aLeft, bLeft) - Math.min(aRight, bRight);

  if (horizontalGap >= -40) {
    // Faces are side-to-side: connect the right edge of the left box to the
    // left edge of the right box at a shared vertical position.
    const [left, right] = aLeft + a.width / 2 < bLeft + b.width / 2 ? [a, b] : [b, a];
    const startX = left.x + left.width;
    const endX = right.x;
    const rawY = (left.y + left.height / 2 + right.y + right.height / 2) / 2;
    const startY = clampVertical(rawY, left);
    const endY = clampVertical(rawY, right);
    if (Math.abs(startY - endY) < 8) {
      return `M${startX},${startY} H${endX}`;
    }
    const midX = Math.round((startX + endX) / 2);
    return `M${startX},${startY} C${midX},${startY} ${midX},${endY} ${endX},${endY}`;
  }

  // Stacked vertically: connect bottom edge of the upper box to top edge of
  // the lower box at a shared horizontal position.
  const [top, bottom] = a.y + a.height / 2 < b.y + b.height / 2 ? [a, b] : [b, a];
  const startY = top.y + top.height;
  const endY = bottom.y;
  const rawX = (top.x + top.width / 2 + bottom.x + bottom.width / 2) / 2;
  const startX = clampHorizontal(rawX, top);
  const endX = clampHorizontal(rawX, bottom);
  if (Math.abs(startX - endX) < 8) {
    return `M${startX},${startY} V${endY}`;
  }
  const midY = Math.round((startY + endY) / 2);
  return `M${startX},${startY} C${startX},${midY} ${endX},${midY} ${endX},${endY}`;
}

/** Midpoint of a path's coordinate bounding box, for label placement. */
export function pathMidpoint(path: string): { x: number; y: number } {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [0, 0];
  const xs: number[] = [];
  const ys: number[] = [];
  numbers.forEach((value, index) => (index % 2 === 0 ? xs : ys).push(value));
  if (xs.length === 0 || ys.length === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

function clampVertical(value: number, box: Box): number {
  return Math.round(Math.min(Math.max(value, box.y + 10), box.y + box.height - 10));
}
function clampHorizontal(value: number, box: Box): number {
  return Math.round(Math.min(Math.max(value, box.x + 10), box.x + box.width - 10));
}
