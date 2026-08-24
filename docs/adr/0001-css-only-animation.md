# ADR 0001 - CSS-only animation; SMIL is structurally banned

**Status:** Accepted (the founding constraint)

## Context

FlowInk exists because of a defect: architecture diagrams rendered as empty boxes in
GitHub READMEs while rendering perfectly in a direct browser tab. Bisection against
stripped-down variants isolated the cause: **SMIL elements (`<animate>`,
`<animateMotion>`) combined with a `<style>` block make Chromium's SVG-as-image
renderer refuse to paint the document.** GitHub README images are exactly that
context. Four repos shipped the defect before it was diagnosed.

## Decision

The renderer emits **CSS-only animation** (keyframes for dash flows, opacity pulses,
and `offset-path` packets) and *structurally cannot* emit SMIL - there is no code path
that produces those elements. Test suites on both language stacks assert the output
contains none.

## Consequences

- Output is safe in any `<img>` context by construction, not by discipline.
- The animation grammar is deliberately small (three techniques); anything SMIL could
  do that CSS cannot is not worth the render risk in the primary delivery context.
- `prefers-reduced-motion` support is built into the generated stylesheet.
