# Limitations and known quirks

What FlowInk deliberately does not do, and the behaviors most likely to surprise a
new author. Each entry includes the workaround where one exists.

## Layout and authoring

- **Manual placement is the model.** Nodes carry explicit `x`/`y`; there is no
  auto-layout ([ADR 0003](adr/0003-manual-layout.md)). At architecture-diagram scale
  (≈5-12 nodes) this is a feature; at 25+ nodes it becomes work.
- **Label collision is your duty.** Edge labels sit at the path midpoint by default;
  expect 2-3 nudging passes per diagram. Workarounds: move nodes, or supply a manual
  edge `path` that routes the line away from the label.
- **Manual edge paths are used verbatim.** No validation, no geometry derivation. Keep
  them single-subpath (`M…C…`), especially with `packet: true` - `offset-path` follows
  the path data as written, and multi-subpath data makes the packet ride
  unpredictably.
- **No text wrapping.** Long node lines widen the box (up to the canvas edge). Keep
  detail lines short; the width formula assumes ~7.2px per monospace character.
- **Fixed canvas.** The SVG has a fixed `viewBox` and scales as an image; it never
  reflows content at small sizes. Pick the 16:8.5-ish default or set explicit
  `width`/`height`.

## Embedding contexts

- **Class names are theme-scoped, not instance-scoped.** Two diagrams with the
  *same* theme on one page share class and keyframe names (identical rules -
  harmless). Two diagrams with *different* themes are independent since v0.1.1;
  before that, the last `<style>` block repainted both. If you fork the renderer or
  hand-edit output, preserve the `fi-<theme>-…` scoping.
- **The `<img>` context is the target, and its rules are absolute**: no JavaScript,
  no external resources, and - the trap that shaped the library - SMIL combined with
  CSS paints nothing in Chromium's SVG-as-image path. FlowInk output is SMIL-free by
  construction; do not add `<animate>` to rendered files.
- **Reduced motion freezes animation by design** - never encode meaning in motion
  alone; colors and labels carry it.
- **Host-CSS isolation is guaranteed against generic app CSS, not targeted sabotage.**
  All paint properties ride inline `!important` (the only construct that outranks
  host `!important` rules), so framework resets, preflights, and global
  `svg rect`-style rules cannot restyle a diagram. A stylesheet that deliberately
  targets `fi-`-prefixed selectors or the animation classes can still interfere -
  CSS has no sovereignty mechanism against that; treat it as a bug report against
  the host page.

## Resource bounds

Specs are validated against deliberate ceilings: **500 nodes, 1,000 edges, 12 detail
lines per node, 10,000 characters per text or path field**. Generous for
architecture diagrams; small enough that a flooded spec (accidental or hostile)
fails with a clear error instead of producing a multi-megabyte SVG. Servers
rendering user-supplied specs get DoS protection for free.

## Strict CSP environments

Under a `Content-Security-Policy` whose `style-src` omits `'unsafe-inline'`,
browsers block the inline style attributes that carry FlowInk's host-CSS
isolation. The renderer emits **presentation attributes as a fallback layer** on
every path: colors remain correct via attributes (which CSP does not restrict),
while the anti-hijack and animation layers are disabled. In practice: strict-CSP
apps get correct static diagrams; everything else gets the full hardened,
animated experience.

## Tooling and publishing

- **Packages are not on registries yet.** Consume via workspace wiring or packed
  tarballs (see the README's [Setup and usage](../README.md#setup-and-usage)); while
  unpublished, install multi-tarball packages in one `npm install` so peer
  dependencies resolve.
- **Local NuGet feeds cache by exact version.** Iterating against FlowInk from a
  local feed requires bumping the package version (or clearing the global packages
  cache) - standard NuGet behavior, but it will surprise you mid-iteration
  ([findings F4](findings-first-consumer-validation.md)).
- **The CLI bundles core** and installs with zero dependencies; the React and Angular
  packages treat `@flowink/core` as a peer. Installing `@flowink/react` alone against
  the registry will 404 until publication.
