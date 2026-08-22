import type { FlowEdge, FlowNode, FlowSpec } from './spec.js';
import { dark, light, type Theme } from './theme.js';
import { connectBoxes, measureNode, pathMidpoint, type Box } from './geometry.js';

/**
 * Renders a FlowSpec to a complete, self-contained SVG document.
 *
 * Hard guarantees (the reason this library exists):
 *   - CSS-only animation: the output NEVER contains SMIL elements
 *     (`<animate>`, `<animateMotion>`, `<animateTransform>`). SMIL combined
 *     with a `<style>` block makes Chromium's SVG-as-image renderer paint
 *     nothing — which is exactly the context GitHub READMEs render in.
 *   - No scripts, no external references (fonts are system stacks), so the
 *     document is safe to embed anywhere an `<img>` can go.
 *   - `prefers-reduced-motion` freezes all animation.
 */
export function renderFlow(spec: FlowSpec): string {
  const theme: Theme = spec.theme === 'light' ? light : dark;
  const width = spec.width ?? 1200;
  const height = spec.height ?? 640;

  validateSpec(spec);

  const boxes = new Map<string, Box>();
  for (const node of spec.nodes) {
    boxes.set(node.id, measureNode(node.label, node.lines ?? [], node.x, node.y, node.width, node.height));
  }

  const parts: string[] = [];
  parts.push(openSvg(spec, width, height, theme));
  parts.push(renderDefs(theme));
  parts.push(renderStyle(spec, theme));
  parts.push(renderBackground(width, height, theme));
  parts.push(renderTitle(spec, width, theme));

  // Edges render beneath nodes.
  for (const edge of spec.edges) {
    parts.push(renderEdge(edge, boxes, theme));
  }
  for (const node of spec.nodes) {
    parts.push(renderNode(node, boxes.get(node.id)!, theme));
  }

  parts.push('</svg>\n');
  return parts.join('\n');
}

function validateSpec(spec: FlowSpec): void {
  const ids = new Set(spec.nodes.map((node) => node.id));
  if (ids.size !== spec.nodes.length) {
    throw new Error('Duplicate node ids in spec.');
  }
  for (const edge of spec.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      throw new Error(`Edge references unknown node: ${edge.from} -> ${edge.to}`);
    }
  }
}

function openSvg(spec: FlowSpec, width: number, height: number, theme: Theme): string {
  const label = `${spec.title}${spec.subtitle ? ` — ${spec.subtitle}` : ''}. Animated flows: colored dashes move along request paths; node borders breathe.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(label)}">`
    .replace('>', `>\n  <title>${escapeXml(spec.title)}</title>`);
}

function renderDefs(theme: Theme): string {
  return `  <defs>
    <pattern id="flowink-dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="${theme.dot}"/>
    </pattern>
  </defs>`;
}

function renderStyle(spec: FlowSpec, theme: Theme): string {
  const colors: Array<[string, string]> = Object.entries(theme.flows) as Array<[string, string]>;
  const keyframes = colors
    .map(
      ([name]) =>
        `    @keyframes flowink-dash-${name}-f { to { stroke-dashoffset: -16; } }\n    @keyframes flowink-dash-${name}-b { to { stroke-dashoffset: 16; } }`,
    )
    .join('\n');

  const flowClasses = colors
    .map(
      ([name, hex]) =>
        `    .flowink-flow-${name} { stroke: ${hex}; stroke-width: 2; fill: none; stroke-dasharray: 5 11; animation: flowink-dash-${name}-f 1.5s linear infinite; }\n    .flowink-flow-${name}-b { animation-name: flowink-dash-${name}-b; }`,
    )
    .join('\n');

  return `  <style>
    .flowink-node { fill: ${theme.nodeFill}; stroke: ${theme.nodeStroke}; stroke-width: 1.2; }
    .flowink-edge { stroke: ${theme.edge}; stroke-width: 1.5; fill: none; }
    .flowink-pulse { animation: flowink-pulse 3s ease-in-out infinite; }
${flowClasses}
    .flowink-packet { animation: flowink-ride 1.5s linear infinite; }
    @keyframes flowink-pulse { 0%, 100% { stroke-opacity: 1; } 50% { stroke-opacity: .5; } }
    @keyframes flowink-ride { from { offset-distance: 0%; } to { offset-distance: 100%; } }
${keyframes}
    @media (prefers-reduced-motion: reduce) { .flowink-flow-sky, .flowink-flow-emerald, .flowink-flow-amber, .flowink-flow-rose { animation: none; } .flowink-pulse, .flowink-packet { animation: none; } }
  </style>`;
}

function renderBackground(width: number, height: number, theme: Theme): string {
  return `  <rect width="${width}" height="${height}" fill="${theme.canvas}"/>
  <rect width="${width}" height="${height}" fill="url(#flowink-dots)" opacity=".5"/>`;
}

function renderTitle(spec: FlowSpec, width: number, theme: Theme): string {
  const parts: string[] = [];
  parts.push(
    `  <text x="40" y="46" style="font: 600 20px ui-sans-serif, system-ui, sans-serif" fill="${theme.title}">${escapeXml(spec.title)}</text>`,
  );
  if (spec.subtitle) {
    parts.push(
      `  <text x="40" y="68" style="font: 12px ui-monospace, SFMono-Regular, Menlo, monospace" fill="${theme.subtitle}">${escapeXml(spec.subtitle)}</text>`,
    );
  }
  if (spec.chip) {
    const chipWidth = Math.max(200, spec.chip.length * 6.4 + 40);
    const chipX = width - chipWidth - 40;
    parts.push(`  <rect x="${chipX}" y="30" width="${chipWidth}" height="26" rx="13" fill="none" stroke="${theme.chipStroke}" stroke-opacity=".5"/>`);
    parts.push(
      `  <text x="${chipX + chipWidth / 2}" y="47" text-anchor="middle" style="font: 10px ui-monospace, SFMono-Regular, Menlo, monospace" fill="${theme.chipStroke}">${escapeXml(spec.chip)}</text>`,
    );
  }
  return parts.join('\n');
}

function renderEdge(edge: FlowEdge, boxes: Map<string, Box>, theme: Theme): string {
  const from = boxes.get(edge.from)!;
  const to = boxes.get(edge.to)!;
  const path = connectBoxes(from, to, edge.path);
  const color = edge.color ?? 'sky';
  const direction = edge.direction ?? 'forward';
  const parts: string[] = [];

  // Base edge first (visible even with animation frozen).
  parts.push(`  <path class="flowink-edge" d="${path}"/>`);
  if (direction !== 'none') {
    const backward = direction === 'backward' ? ' flowink-flow-sky-b flowink-flow-emerald-b flowink-flow-amber-b flowink-flow-rose-b' : '';
    parts.push(`  <path class="flowink-flow-${color}${backward}" d="${path}"/>`);
  }

  if (edge.label) {
    const mid = pathMidpoint(path);
    parts.push(
      `  <text x="${round(mid.x)}" y="${round(mid.y) - 8}" text-anchor="middle" style="font: 10px ui-monospace, SFMono-Regular, Menlo, monospace" fill="${theme.flows[color]}">${escapeXml(edge.label)}</text>`,
    );
  }

  if (edge.packet && direction !== 'none') {
    // CSS Motion Path rides the same geometry; inline style keeps the offset
    // path scoped to this element. Note offset-path uses the path's own
    // coordinate space relative to the element position, so the circle is
    // placed at the origin and the path translates absolutely.
    parts.push(`  <circle class="flowink-packet" r="3.5" fill="${theme.packet}" style="offset-path: path('${path}')"/>`);
  }

  return parts.join('\n');
}

function renderNode(node: FlowNode, box: Box, theme: Theme): string {
  const parts: string[] = [];
  const pulseClass = node.pulse ? ' flowink-pulse' : '';
  const duration = typeof node.pulse === 'number' ? ` style="animation-duration: ${node.pulse}ms"` : '';
  parts.push(`  <rect class="flowink-node${pulseClass}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="10"${duration}/>`);
  parts.push(
    `  <text x="${box.x + 20}" y="${box.y + 26}" style="font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .5px" fill="${theme.nodeText}">${escapeXml(node.label)}</text>`,
  );
  (node.lines ?? []).forEach((line, index) => {
    parts.push(
      `  <text x="${box.x + 20}" y="${box.y + 48 + index * 18}" style="font: 11px ui-monospace, SFMono-Regular, Menlo, monospace" fill="${theme.bodyText}">${escapeXml(line)}</text>`,
    );
  });
  return parts.join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function round(value: number): number {
  return Math.round(value);
}

export { escapeXml };
