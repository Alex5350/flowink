import { renderFlow } from '@flowink/core/dist/index.js';
import type { FlowSpec } from '@flowink/core';

export { type FlowSpec, type FlowNode, type FlowEdge, type FlowColor } from '@flowink/core';

/**
 * Renders a FlowInk diagram as an inline `<div>` wrapping the generated SVG.
 *
 * Server-render-safe by construction: the component is a pure function of its
 * props — no effects, no client-only APIs — so Next.js App Router (RSC) and
 * classic SSR render it identically to the client. The SVG markup is produced
 * by the core renderer and fully XML-escaped there.
 */
export function FlowDiagram({ spec, className, style }: { spec: FlowSpec; className?: string; style?: React.CSSProperties }): React.ReactElement {
  const svg = renderFlow(spec);
  return (
    <div
      className={className}
      style={style}
      role="img"
      aria-label={spec.title}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Convenience for static sites and build scripts: the raw SVG document string. */
export function renderFlowToString(spec: FlowSpec): string {
  return renderFlow(spec);
}
