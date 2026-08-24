# ADR 0003 - Manual node placement; no auto-layout in v1

**Status:** Accepted (revisit at ~25+ node diagrams)

## Context

Diagram libraries default to auto-layout (force, layered, ranking). The diagrams this
library generalizes are architecture summaries: ~5-12 nodes, one hero path, satellite
concerns deliberately placed above/below it.

## Decision

Nodes carry explicit `x`/`y`; the renderer sizes boxes from content and derives edge
geometry (straight/curved) from box facing, with manual `path` override per edge.
No layout engine, no layout dependencies.

## Consequences

- Specs read like what they are: a human's judgment about what sits where.
- Zero layout-algorithm surface to tune, and deterministic output - which is what
  makes byte-parity between renderers achievable.
- The known cost: label collision avoidance is the author's job (the tutorial is
  honest that manual labels take 2-3 nudging passes).
- If large diagrams arrive, the escape hatch is additive: a layout pass that
  *populates coordinates* in the spec before rendering, never a renderer-side engine.
