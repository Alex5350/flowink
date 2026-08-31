# FlowInk: the engineering view

The companion to the [README's product story](README.md): the architecture, the render path
end to end, the full spec reference, and every major engineering decision traced back to the
README-diagram problem it exists to solve. Decision records and validation findings are
linked throughout rather than duplicated.

## Architecture

![FlowInk architecture - one spec JSON parsed by a shared renderer core, with a byte-parity C# twin, feeding four consumption environments: Next.js, Angular, CLI, and Blazor, each writing committed artifacts and docs pages](docs/diagrams/architecture.svg)

One spec, one rendering core per ecosystem, four ways to consume:

- **The spec.** A `FlowSpec` JSON document: nodes with manual coordinates, edges with
  semantic colors and optional packets. The contract both renderers implement
  ([ADR 0002](docs/adr/0002-spec-parity.md)).
- **`@flowink/core`** ([packages/core](packages/core)): the TypeScript renderer, pure string
  generation with zero dependencies. `spec.ts` holds the types and validation,
  `geometry.ts` the node sizing and edge anchoring, `theme.ts` the dark/light palettes,
  `render.ts` the document assembly.
- **`FlowInk.Core`** ([dotnet/src/FlowInk.Core](dotnet/src/FlowInk.Core)): the C# twin,
  JSON spec parsing with strictly-typed deserialization.
  [`FlowInk.Blazor`](dotnet/src/FlowInk.Blazor) adds the static-SSR component on top.
- **Consumers.** [`@flowink/react`](packages/react) (pure function of props, RSC/SSR-safe,
  plus `renderFlowToString` for build-time output), [`@flowink/angular`](packages/angular)
  (standalone, OnPush, ng-packagr compiled), and the [`flowink`](packages/cli) CLI
  (esbuild single-file bundle, zero runtime dependencies) - the README workflow.
- **The parity fixture.** [dotnet/tests/FlowInk.Tests/fixtures/parity-ts.svg](dotnet/tests/FlowInk.Tests/fixtures/parity-ts.svg):
  a TypeScript-rendered SVG, committed, that the C# suite asserts against.

```text
packages/core/     TypeScript renderer (zero dependencies)
packages/react/    React component (SSR-safe)
packages/angular/  Angular standalone component (ng-packagr)
packages/cli/      flowink render - the README workflow
apps/demo-angular/ compiling, runnable consumer proof
dotnet/src/        FlowInk.Core (C# renderer) + FlowInk.Blazor
dotnet/tests/      parity suite with the committed golden fixture
docs/              tutorial, ADRs, gallery, diagrams (spec + generated svg)
```

## How the tech solves the business problem

| Business problem | Engineering decision | Why this tech | What it buys | Where documented |
|---|---|---|---|---|
| Hand-animated README diagrams rendered as empty boxes on GitHub | CSS-only animation; the renderer has no code path that emits SMIL | SMIL plus a `<style>` block makes Chromium's SVG-as-image path paint nothing, and GitHub README images are exactly that context | Diagrams animate wherever READMEs render, by construction; tests on both stacks assert SMIL absence; `prefers-reduced-motion` is built into the generated stylesheet | [ADR 0001](docs/adr/0001-css-only-animation.md) |
| The same diagram could differ between the npm and NuGet worlds | One spec, two renderers (TypeScript and C#), parity enforced by a committed golden fixture compared in tests | The task is pure string generation; forcing one ecosystem to call the other couples them for no benefit | The same diagram cannot silently differ between the npm and NuGet worlds; any renderer change must update the fixture deliberately, so drift fails CI | [ADR 0002](docs/adr/0002-spec-parity.md) |
| Auto-layout produces spaghetti at architecture-diagram scale | Manual node coordinates; the renderer sizes boxes from content and derives edge geometry, with per-edge `path` override | At 5-12 nodes a human's judgment about what sits where beats force or layered layout, and deterministic output is what makes byte parity achievable | Deterministic, readable diagrams; zero layout-algorithm surface to tune; specs read like what they are | [ADR 0003](docs/adr/0003-manual-layout.md) |
| Every consumer injects the rendered SVG as raw markup, so diagrams built from other people's specs could smuggle scripts | Injection trust boundary: the whole document comes from hard-coded templates plus XML-escaped, runtime-coerced spec text | TypeScript types do not hold at the JSON boundary; a crafted spec once produced six injected `<script>` tags through numeric fields and raw path data | Diagrams from user specs cannot inject markup; a malicious-spec battery and fuzz loop pin the guarantee on both stacks | [ADR 0004](docs/adr/0004-injection-trust-boundary.md), [findings F8](docs/findings-first-consumer-validation.md) |
| Host page CSS hijacks diagram colors and fonts | Every paint-critical property rides inline `!important`; generated classes survive only to carry animation | An inline `!important` declaration is the one construct that outranks host `!important` stylesheet rules | Immunity to generic app CSS (resets, preflights, global element rules); under strict CSP, presentation attributes keep the colors correct with animation lost | [findings F7](docs/findings-first-consumer-validation.md) |
| Two diagrams with different themes on one page repaint each other | Theme-scoped class, keyframe, and pattern names (`fi-dark-*`, `fi-light-*`) | Inline SVG `<style>` blocks are document-scoped, not SVG-scoped; colors differ only by theme, so theme is the correct scope key | Mixed-theme pages render each diagram with its own palette | [findings F6](docs/findings-first-consumer-validation.md), [limitations](docs/limitations.md) |
| A server rendering API-supplied specs is a memory and DOM flood surface | `validateSpec` resource bounds: at most 500 nodes, 1,000 edges, 12 detail lines per node, 10,000 characters per text or path field | Caps generous for real architecture diagrams, small enough to fail fast under flood | Opaque crashes become explicit, actionable errors; a flood cannot balloon the output | [findings F9](docs/findings-first-consumer-validation.md) |

The row that shaped the library is the first. The animated diagrams across my portfolio
READMEs were hand-authored SVGs, and every rule in them was learned by shipping the failure
first. Bisection against stripped-down variants isolated the cause: SMIL animation elements
combined with a CSS block make Chromium's SVG-as-image renderer refuse to paint the
document, while either half alone renders fine. That asymmetry is why the trap is so easy
to ship: the file looks perfect in a browser tab and dies only in the place it was made for.
Four repos shipped it before it was diagnosed. FlowInk encodes the lesson structurally -
there is no `emitAnimate()` to mistakenly call - and the test suites assert the absence, so
the guarantee cannot regress silently.

## Request and data flow

One representative path: a spec JSON becoming a committed README diagram (the component
renderers follow the same core steps, substituting a string return for a file write).

1. **Parse.** The CLI reads the spec file and parses it into a `FlowSpec`; on the .NET side,
   `FlowRenderer.ParseSpecJson` deserializes with strict types.
2. **Validate.** `validateSpec` checks structure (arrays exist, ids unique, edges reference
   known nodes) and the resource bounds above, failing with explicit errors instead of raw
   `TypeError`s.
3. **Measure.** Every node gets a box: width wraps the longest line at 7.2px per monospace
   character (minimum 160), height grows with the line count, and explicit `width`/`height`
   override both.
4. **Connect.** Every edge derives its path from how the two boxes face each other:
   side-by-side boxes connect edge to edge (straight when aligned, one gentle cubic curve
   when not), vertically stacked boxes connect bottom to top, and a manual `path` is used
   verbatim.
5. **Assemble.** The document is emitted in order: the SVG opening tag with `<title>` and
   aria-label, the dot-pattern `defs`, the theme-scoped `<style>` block (flow keyframes,
   pulses, packets, and the `prefers-reduced-motion` opt-out), the background, the title and
   chip, then edges beneath nodes so boxes paint over line endings.
6. **Escape and coerce at the sink.** Every numeric interpolation passes through a clamping
   `safeInt` (finite number to clamped integer), and every piece of spec text, manual path
   data included, through XML escaping - the trust boundary in practice.
7. **Deliver.** The CLI writes the file; `renderFlow(spec)` returns the string; the React
   and Angular components and the Blazor component inject exactly this string through their
   framework's raw-markup escape hatch, each documented at the call site.

Edge labels are placed at the midpoint of the path's coordinate bounding box; packets are
CSS Motion Path circles riding the same geometry as the edge. The base edge path is always
drawn first, un-animated, so a frozen diagram (reduced motion, or CSP without inline
styles) remains complete.

## The spec, in full

A diagram is a JSON document. This is the complete schema: every field, its default, and
what it does.

**Top level**

| Field | Type | Default | Meaning |
|---|---|---|---|
| `title` | string | *required* | Diagram title; also the SVG `<title>` for accessibility |
| `subtitle` | string | - | Muted line under the title; use it for the color legend |
| `chip` | string | - | Right-aligned pill with a one-line guarantee |
| `theme` | `"dark" \| "light"` | `"dark"` | Showcase dark, or a paper light palette |
| `width` / `height` | number | 1200 / 640 | Canvas pixels |
| `nodes` | FlowNode[] | *required* | The boxes |
| `edges` | FlowEdge[] | *required* | The flows |

**FlowNode**

| Field | Type | Default | Meaning |
|---|---|---|---|
| `id` | string | *required* | Edge reference target |
| `label` | string | *required* | Bold first line |
| `lines` | string[] | `[]` | Detail lines (smaller, muted) |
| `x`, `y` | number | *required* | Top-left corner, canvas pixels; manual placement is deliberate ([ADR 0003](docs/adr/0003-manual-layout.md)) |
| `width`, `height` | number | content-derived | Box size; the renderer wraps your longest line |
| `pulse` | boolean \| number | - | Border "breathing" (`true` = 3s cycle; a number sets milliseconds) |

**FlowEdge**

| Field | Type | Default | Meaning |
|---|---|---|---|
| `from`, `to` | string | *required* | Node ids |
| `color` | `"sky" \| "emerald" \| "amber" \| "rose"` | `"sky"` | Sky = primary path, emerald = auth, amber = integrations, rose = fallback; a diagram's subtitle usually redefines the legend for its own story |
| `label` | string | - | Small colored label at the path midpoint |
| `direction` | `"forward" \| "backward" \| "none"` | `"forward"` | Dash march direction; `none` = static |
| `packet` | boolean | - | A dot rides the path (CSS Motion Path) |
| `path` | string | auto | Manual SVG path data from `from` to `to`, overriding the auto geometry |

Edge geometry is derived from how boxes face each other (straight when aligned, one gentle
curve when not); provide `path` when you want a deliberate custom route. Working examples:
[`docs/diagrams/architecture.json`](docs/diagrams/architecture.json) and the three gallery
specs in [`docs/gallery/`](docs/gallery/) (a CI pipeline, an event-driven backend with a
retry loop, and a client-server round trip, each committed beside its rendered SVG).
[docs/limitations.md](docs/limitations.md) catalogs what the renderer deliberately does not
do and the authoring duties manual layout leaves with you (label collisions, manual path
caveats).

## Consuming FlowInk

Per-framework runbooks, each ending in a verification step, live in
[docs/quickstarts.md](docs/quickstarts.md); the from-scratch walkthrough of every mechanism
is [docs/tutorial.md](docs/tutorial.md). In brief:

- **React / Next.js:** `<FlowDiagram spec={spec} />` from `@flowink/react`, a pure function
  of props, safe in RSC, SSR, and client components; `renderFlowToString(spec)` for
  build-time output.
- **Angular:** `FlowDiagramComponent` from `@flowink/angular`, standalone and OnPush,
  consumed from the ng-packagr compiled artifact; the in-repo demo
  ([apps/demo-angular](apps/demo-angular)) wires it via tsconfig paths.
- **Blazor / .NET:** `<FlowDiagram Spec="..." />` from `FlowInk.Blazor`, static SSR with no
  JS interop; specs author naturally in C# (`Pulse = true`) or parse from JSON.
- **CLI:** `flowink render spec.json -o diagram.svg`, commit spec and SVG together.

Until the packages are published, consumption goes through packed tarballs and a local
NuGet feed; the quickstarts are the exact recipes the sample apps validated.

## Publishing and validation

The library is publication-ready: names verified available on npm and NuGet,
`prepublishOnly` gates run build plus tests per package, tarball contents are audited
(dist only, test files excluded), and a tag-triggered workflow (`publish.yml`) publishes in
dependency order, core before react and angular, with npm provenance. All six packages
carry one shared version: the two renderers are held to byte parity, so version drift
between them is meaningless. The complete runbook, including manual procedures and incident
handling, is [docs/publishing.md](docs/publishing.md).

Validated, not just built: three fresh sample applications (Next.js 16 RSC, Angular 21,
Blazor static SSR) and a global CLI install consumed the packed artifacts exactly the way a
stranger would, never workspace references. They found real defects, each fixed in the
library: the Angular package was not actually consumable (rebuilt on ng-packagr; a workspace
demo consuming source proves nothing about the published artifact), C# spec authoring was
JSON-shaped rather than C#-shaped (`Pulse` became a record struct with implicit
conversions), and the CLI could not install standalone while unpublished (it now bundles
core via esbuild with zero runtime dependencies). Hardening passes that followed added
theme scoping, host-CSS isolation, the injection-boundary fix, and resource bounds. Every
finding and fix is recorded in
[docs/findings-first-consumer-validation.md](docs/findings-first-consumer-validation.md).

## Stack, and why

| Area | Choice and why |
|---|---|
| **TypeScript core, zero dependencies** | Rendering is pure string generation; zero runtime deps means nothing to drift, exploit, or install ([packages/core](packages/core)) |
| **C# twin, strictly typed at deserialization** | .NET consumers get a natural API and the numeric-smuggle vector is structurally absent ([ADR 0002](docs/adr/0002-spec-parity.md), [ADR 0004](docs/adr/0004-injection-trust-boundary.md)) |
| **React component with core as a peer dependency** | One renderer instance per app; the component stays a pure function of props, RSC/SSR-safe |
| **Angular package via ng-packagr (partial compilation, FESM + types)** | The Angular application builder does not compile TypeScript inside `node_modules`; only a compiled library artifact installs ([findings F1](docs/findings-first-consumer-validation.md)) |
| **CLI as an esbuild single-file bundle** | Installs anywhere with zero dependency resolution, published or not ([findings F3](docs/findings-first-consumer-validation.md)) |
| **CSS-only animation, system font stacks** | The `<img>` context target and its rules, honored end to end ([ADR 0001](docs/adr/0001-css-only-animation.md)) |
| **Vitest + xUnit** | Guarantee and parity suites mirrored on both stacks |

## Testing

Three tiers, each protecting something specific:

- **17 core unit tests** ([packages/core/src/render.test.ts](packages/core/src/render.test.ts)):
  self-contained output with the accessibility title; SMIL absence (the guarantee);
  keyframes for every color plus the reduced-motion opt-out; node, edge, label, and packet
  rendering; straight-segment geometry; XML escaping; the light theme; spec rejection cases
  (unknown edges, duplicate ids); host-CSS isolation (paint properties inline with
  `!important`); malicious-spec resistance including smuggled string numerics; resource
  bounds; and a 300-spec randomized hostile fuzz.
- **2 React tests** ([packages/react/src/index.test.tsx](packages/react/src/index.test.tsx)):
  the component server-renders the SVG with no SMIL and the spec title, and exposes the raw
  string renderer for build-time use.
- **5 xUnit facts** ([dotnet/tests/FlowInk.Tests](dotnet/tests/FlowInk.Tests)): the same
  guarantees on the .NET side, including
  `Parity_With_TypeScript_Core_On_The_Dogfood_Spec`, the whitespace-normalized byte
  comparison against the committed golden fixture
  ([dotnet/tests/FlowInk.Tests/fixtures/parity-ts.svg](dotnet/tests/FlowInk.Tests/fixtures/parity-ts.svg)).

CI ([ci.yml](.github/workflows/ci.yml)) additionally pins the packaging story: it builds
all four TypeScript packages, packs the Angular package the way consumers install it,
installs the CLI tarball globally with no other packages present and renders with it,
asserts zero `<animate>` on both that render and a dogfood re-render of the committed
architecture diagram, compiles the demo app against the component, and runs the .NET build
plus the parity suite.

## Security and operations

- **The injection trust boundary** ([ADR 0004](docs/adr/0004-injection-trust-boundary.md)):
  no code path leads from spec fields to executable content. The renderer loads no scripts,
  references no external resources, and emits no event handlers; text is escaped and
  numerics coerced at the sink, not just typed at the source. Consumer guidance: pass specs
  as data; parse JSON rather than concatenating spec strings from untrusted input.
- **Resource bounds** cap floods before rendering, with explicit errors
  ([findings F9](docs/findings-first-consumer-validation.md)).
- **CSP degradation**: presentation attributes ride alongside the inline-`!important` layer,
  so strict `style-src` deployments keep correct colors with animations lost, never a broken
  diagram.
- **Honest boundaries**: a stylesheet that deliberately targets `fi-` prefixed selectors can
  still fight a diagram (generic app CSS cannot); reduced motion freezes animation by
  design, so meaning never rides on motion alone ([findings F7](docs/findings-first-consumer-validation.md),
  [limitations](docs/limitations.md)).
- **Operations**: publishing is tag-triggered only; versioning is a single shared bump
  across all six packages with CI catching stale references
  ([docs/publishing.md](docs/publishing.md)).

## Jargon

Terms used across this repo, from [SMIL](docs/GLOSSARY.md) to [byte parity](docs/GLOSSARY.md),
are defined in the [glossary](docs/GLOSSARY.md), plain English first.
