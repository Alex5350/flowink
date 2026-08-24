# ADR 0004 - Trust boundary for injected diagram markup

**Status:** Accepted

## Context

Every consumer embeds the renderer's output as raw markup - `dangerouslySetInnerHTML`
(React), `[innerHTML]` (Angular), `MarkupString` (Blazor). These are the standard
XSS vectors, so the boundary must be explicit.

## Decision

The entire output document is produced by the renderer from two trusted inputs:
hard-coded markup templates and **XML-escaped** spec text. The renderer loads no
scripts, references no external resources, emits no event handlers, and (per ADR 0001)
no SMIL. Framework wrappers bypass sanitization *only* for this string and document
why at each call site.

## Consequences

- There is no code path from spec fields to executable content; escaping tests pin
  the property on both stacks.
- If the renderer ever grows templating hooks (user-supplied markup), this ADR must
  be revisited - that feature would break the boundary.
- Consumer guidance: pass specs as data; never build spec strings by concatenating
  untrusted input (parse JSON instead).
