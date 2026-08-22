/**
 * FlowInk spec — the framework-agnostic description of an animated flow diagram.
 *
 * A diagram is a title, an optional subtitle, a set of manually positioned nodes,
 * and edges between them. Coordinates are absolute pixels on the canvas
 * (default 1200 × 640). Manual placement is a deliberate v1 decision: the diagrams
 * this library generalizes are small (≈10 nodes), and hand-positioned labels read
 * better than any auto-layout at this size.
 */

/** Semantic edge colors. The legend is part of the design language:
 *  sky = primary request path, emerald = auth, amber = secondary integration,
 *  rose = fallback/error path. */
export type FlowColor = 'sky' | 'emerald' | 'amber' | 'rose';

/** One box on the canvas. */
export interface FlowNode {
  /** Stable id referenced by edges. */
  id: string;
  /** Bold first line (node title). */
  label: string;
  /** Additional detail lines rendered smaller below the label. */
  lines?: string[];
  /** Top-left corner in canvas pixels. */
  x: number;
  y: number;
  /** Box size; defaults are derived from content when omitted. */
  width?: number;
  height?: number;
  /** Border "breathing" pulse. `true` uses the default 3s cycle;
   *  a number sets the duration in milliseconds. */
  pulse?: boolean | number;
}

/** A flow between two nodes. */
export interface FlowEdge {
  from: string;
  to: string;
  /** Small label rendered near the path midpoint. */
  label?: string;
  color?: FlowColor;
  /** `forward` animates left→right/top→bottom, `backward` the reverse,
   *  `none` draws a static line. Default `forward`. */
  direction?: 'forward' | 'backward' | 'none';
  /** Animate a small dot riding the path (CSS Motion Path). */
  packet?: boolean;
  /**
   * Manual SVG path data drawn from the `from` anchor to the `to` anchor.
   * When omitted, the renderer draws a simple line between the nearest
   * facing edges of the two boxes, curved slightly when they are not
   * horizontally aligned.
   */
  path?: string;
}

export interface FlowSpec {
  title: string;
  subtitle?: string;
  /** Canvas size, default 1200 × 640. */
  width?: number;
  height?: number;
  /** `dark` (default) is the showcase theme; `light` inverts to a paper look. */
  theme?: 'dark' | 'light';
  /** Corner chip text, e.g. a one-line product guarantee. */
  chip?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}
