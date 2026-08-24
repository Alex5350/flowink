# First consumer validation - findings and fixes

Three fresh sample applications (unpublished, local only) consumed FlowInk exactly the
way a stranger would: from **packed artifacts** (`npm pack` tarballs and `.nupkg` files
from a local NuGet feed), never workspace references. Each sample was built, served,
and browser-verified. This file records what broke, what it taught, and what changed
in the library as a result.

| Sample | Consumption | Outcome |
|---|---|---|
| Next.js 16 (`sample-next`) | `npm install` core + react tarballs | ✅ passed on first attempt |
| Angular 21 (`sample-angular`) | `npm install` core + angular tarballs | ❌ failed → **fixed in library** → ✅ |
| Blazor, static SSR (`SampleBlazor`) | `dotnet add package` from local feed | ⚠️ natural-C# blocked → **fixed in library** → ✅ |
| CLI | `npm install -g` cli tarball | ❌ failed → **fixed in library** → ✅ |

## F1 - The Angular package was not actually consumable (packaged libraries ≠ source)

**Symptom.** A fresh Angular app installing the `@flowink/angular` tarball failed to
build: `Could not resolve "@flowink/angular"`, `TS2307`, and cascading
`NG1010: 'imports' must be an array of components…`.

**Root cause.** The package shipped raw TypeScript with no entry points (`main`,
`types`, `exports`) and no compiled output. The Angular application builder does not
compile TypeScript inside `node_modules` - by design. Worse, the in-repo demo app
never caught this because it consumed the package through `tsconfig` path mappings to
the source tree, which is a *different consumption mode* than any real consumer uses.
**The demo validated the component; it did not validate the package.**

**Fix.** The package now builds with **ng-packagr** (partial-compilation mode,
`compilationMode: "partial"`), producing a proper FESM2022 bundle plus types, with
`module`/`types`/`exports` entries pointing at real artifacts and `@flowink/core` as
a peer dependency. The CI pipeline builds the package this way so it cannot regress.

**Lesson.** *A workspace demo that consumes source proves nothing about the published
artifact. Validation must consume the packed artifact - the thing `npm install`
actually delivers.*

## F2 - C# spec authoring was JSON-shaped, not C#-shaped

**Symptom.** `Pulse = true` in a Blazor page failed to compile: the property was
typed `System.Text.Json.JsonElement?` (chosen so one property could accept JSON
`true`, `false`, or a number).

**Root cause.** Modeling a union type (`bool | number`) via `JsonElement` optimizes
for deserialization at the direct expense of every C# consumer. In a library whose
second-largest audience is .NET developers writing specs in the page, that's the wrong
trade.

**Fix.** A `Pulse` readonly record struct with **implicit conversions from `bool` and
`int`** plus a `JsonConverter` that reads/writes the union form. JSON stays
`"pulse": true` / `"pulse": 2400`; C# reads `Pulse = true`, `Pulse = 2400`, or
`Pulse = false`. Parity tests unchanged and green.

## F3 - The CLI could not install standalone while unpublished

**Symptom.** `npm install -g flowink-cli-0.1.0.tgz` failed with `E404` - npm tried
to resolve the CLI's `@flowink/core: 0.1.0` dependency against the public registry,
where no such package exists.

**Root cause.** A regular `dependencies` entry on an unpublished package is a
registry fetch. The same trap would apply to `@flowink/react` when installed alone.

**Fix (CLI).** The CLI now **bundles** `@flowink/core` via esbuild into a single
self-contained `dist/cli.js` and declares **zero runtime dependencies**. A terminal
tool should install anywhere with no dependency resolution at all. Verified: global
install + render round-trip with no core package present.

**Fix (React).** `@flowink/react` moves `@flowink/core` to **peerDependencies** -
correct for published life too (the types flow through; consumers must not risk
duplicate renderer instances), with a dev dependency for the in-repo tests. Documented:
while unpublished, install both tarballs in one `npm install` command (the sample does
exactly this).

## F6 - Two themes on one page fought over styles (found by the docs audit)

**Symptom.** A documentation review question - "what else should the docs capture?"
- prompted auditing the dual-theme sample page with computed styles: the dark
diagram's nodes computed the *light* theme's fills. Inline SVG `<style>` blocks are
**document-scoped**, not SVG-scoped, so two diagrams with different themes declared
the same class names and the last block repainted both. The canvas backgrounds
survived (attribute-based fills), making the break a subtle hybrid - easy to read
past in a screenshot.

**Fix.** Every generated class, keyframe, and the dot-pattern `id` are now suffixed
by theme (`fi-dark-node`, `fi-light-flow-sky`, `fi-dark-dots`): colors differ only
by theme, so theme is the correct scope key - same-theme diagrams share names with
identical rules (harmless), different-theme diagrams are fully independent.
Implemented in both renderers; parity fixture regenerated; the dual-theme page now
computes each theme's own colors (verified). Documented in
[limitations.md](limitations.md).

**Lesson.** *Audit computed styles, not screenshots - and an "is there anything else
to document?" pass is itself a test rig.*

## F4 - Local NuGet feeds cache by exact version

**Observation.** Replacing an `.nupkg` in a local folder feed without changing the
version number silently serves the previously-restored copy from the global packages
cache; the sample kept compiling against the old bits until a version bump forced
resolution.

**Not a library defect** - standard NuGet behavior - but it will bite anyone
developing against FlowInk from a local feed. Documented here; the samples' recipe
bumps the patch version per iteration.

## F5 - Verification detail worth keeping

- All three served samples were validated at the HTTP layer *and* in a real browser:
  flow classes present in the served HTML (SSR truth), zero `<animate` occurrences
  (the guarantee), and screenshots reviewed.
- The Blazor full-page screenshot initially appeared to show duplicated diagrams; the
  served HTML audit (exactly 2 `<svg>` elements, correct titles) showed it was a
  screenshot-stitching artifact - **audit the bytes before believing the picture**,
  in both directions.

## Outcome

Three frameworks, four consumption modes (RSC component, standalone component,
static-SSR component, global CLI), all validated from packed artifacts after two
library defects and one packaging gap were found and fixed. The samples live outside
the repository (unpublished, per the validation scope) and are reproducible from the
recipes above.
