# ADR 0002 - One JSON spec, two renderers, enforced parity

**Status:** Accepted

## Context

The consumers span TypeScript apps (React/Next.js, Angular) and .NET (Blazor, CLI
tooling around docs pipelines). A single rendering implementation would force one
ecosystem to call into the other for a task that is pure string generation.

## Decision

- **`FlowSpec` JSON is the contract** - one schema, documented in both packages.
- **Two renderers**: TypeScript (`@flowink/core`) and C# (`FlowInk.Core`).
- **Parity is enforced, not aspirational**: a golden fixture (spec JSON + the
  TypeScript-rendered SVG) is committed, and the C# test suite asserts
  whitespace-normalized equality against it.

## Consequences

- Achieving parity surfaced two real cross-language traps, now encoded in tests:
  `Math.round` (JS, half-away-from-zero) vs `Math.Round` (C#, banker's rounding
  default) diverged a 462.5 anchor by a pixel; chip geometry must remain floating
  point to match JS number-to-string formatting.
- Any renderer change must update the golden fixture deliberately - drift fails CI.
- Future renderers (Rust? Python?) get the same fixture as their acceptance test.
