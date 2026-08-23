# Quickstarts - consuming FlowInk, step by step

Four runbooks, one per consumer type, each ending with a verification step. They are
the exact recipes validated by the sample applications during
[first-consumer validation](findings-first-consumer-validation.md) - nothing here is
theoretical. Until the packages are published to registries, every recipe starts by
packing local artifacts; after publication, step 1 collapses to a plain
`npm install` / `dotnet add package`.

## Table of contents

- [Next.js (React Server Component)](#nextjs)
- [Angular](#angular)
- [CLI (commit a diagram to your README)](#cli)
- [Blazor / .NET](#blazor)

---

## Next.js

**Outcome:** a diagram server-rendered inside a React Server Component - the SVG is
in the HTML, zero client JavaScript for FlowInk.

1. **Pack the artifacts once** (from a clone of this repository):

   ```bash
   git clone https://github.com/Alex5350/flowink.git
   cd flowink && npm install && npm run build
   cd packages/core && npm pack --pack-destination /tmp/packs
   cd ../react  && npm pack --pack-destination /tmp/packs
   ```

2. **Install both tarballs in one command** (while unpublished, `@flowink/react`'s
   peer dependency on core resolves from what this same command installs):

   ```bash
   cd your-next-app
   npm install /tmp/packs/flowink-core-0.1.0.tgz /tmp/packs/flowink-react-0.1.0.tgz
   ```

3. **Describe a diagram** - plain data, no JSX in the spec:

   ```ts
   // src/app/flow.ts
   import type { FlowSpec } from "@flowink/react";

   export const spec: FlowSpec = {
     title: "Checkout - how an order flows",
     subtitle: "requests in sky · payments in amber",
     nodes: [
       { id: "web", label: "WEB APP", lines: ["cart UI"], x: 40, y: 300 },
       { id: "api", label: "API", lines: ["REST handlers"], x: 420, y: 300, pulse: true },
       { id: "pay", label: "PAYMENTS", x: 800, y: 300 },
     ],
     edges: [
       { from: "web", to: "api", label: "POST /orders", color: "sky", packet: true },
       { from: "api", to: "pay", label: "charge", color: "amber" },
     ],
   };
   ```

4. **Render it in a page** (RSC by default in the App Router):

   ```tsx
   // src/app/page.tsx
   import { FlowDiagram } from "@flowink/react";
   import { spec } from "./flow";

   export default function Home() {
     return <FlowDiagram spec={spec} />;
   }
   ```

5. **Verify:** `npm run build && npm start`, then view source on the page - you
   should see `<svg` and `fi-dark-flow-sky` classes in the server-rendered HTML, and
   **no** `<script>` tag for FlowInk. For build-time output without React,
   use `renderFlowToString(spec)`.

**Notes:** multiple diagrams per page are fine, including different themes (class
names are theme-scoped). The component is a pure function of props - safe in RSC,
SSR, and client components alike.

---

## Angular

**Outcome:** a standalone component rendering the diagram, from a properly compiled
library artifact (ng-packagr FESM + types - see
[findings F1](findings-first-consumer-validation.md) for why raw TS cannot work).

1. **Pack the compiled package** (from a FlowInk clone):

   ```bash
   npm run build                      # includes @flowink/angular via ng-packagr
   npm pack -w @flowink/angular --pack-destination /tmp/packs
   npm pack -w @flowink/core   --pack-destination /tmp/packs
   ```

2. **Install core + angular together** (peer dependency, same note as Next.js):

   ```bash
   cd your-angular-app
   npm install /tmp/packs/flowink-core-0.1.0.tgz /tmp/packs/flowink-angular-0.1.0.tgz
   ```

3. **Import the standalone component and use it:**

   ```ts
   // src/app/app.ts
   import { Component } from "@angular/core";
   import { FlowDiagramComponent } from "@flowink/angular";
   import type { FlowSpec } from "@flowink/core";

   const spec: FlowSpec = { /* same shape as the Next.js recipe */ };

   @Component({
     standalone: true,
     imports: [FlowDiagramComponent],
     selector: "app-root",
     template: `<flowink-diagram [spec]="spec" />`,
   })
   export class AppComponent { readonly spec = spec; }
   ```

4. **Verify:** `ng build` compiles clean, and the served page contains the SVG in
   the DOM (`fi-dark-node` classes present, zero `<animate>`).

**Notes:** the component is standalone + OnPush. If you consume FlowInk from a
monorepo instead of tarballs, tsconfig `paths` to the package *sources* also works -
that is how this repository's own demo app is wired - but it is a different
consumption mode than published packages.

---

## CLI

**Outcome:** a committed, animated `architecture.svg` in your repository, referenced
from your README - no framework, no runtime.

1. **Pack and install globally** (the CLI bundles core; zero other dependencies):

   ```bash
   npm run build -w flowink-cli   # in a FlowInk clone
   npm pack -w flowink-cli --pack-destination /tmp/packs
   npm install -g /tmp/packs/flowink-cli-0.1.0.tgz
   ```

2. **Write the spec** next to your docs (this file is source, not generated):

   ```bash
   mkdir -p docs/diagrams
   $EDITOR docs/diagrams/architecture.json    # FlowSpec - see README's spec reference
   ```

3. **Render:**

   ```bash
   flowink render docs/diagrams/architecture.json    # -> architecture.svg alongside it
   ```

4. **Reference it from the README** and **verify the reference landed** (a silently
   failed insertion is a real failure mode - check the file contains the markdown):

   ```markdown
   ![Architecture](docs/diagrams/architecture.svg)
   ```

   ```bash
   grep -c 'architecture.svg' README.md        # must be >= 1
   grep -c '<animate' docs/diagrams/architecture.svg   # must be 0 - SMIL-free guarantee
   ```

5. **Commit both files.** The spec is the source; the SVG is the build artifact -
   regenerating and diffing is your review.

**Notes:** prefer new filenames when fixing a broken image - image CDNs and browsers
cache per path.

---

## Blazor / .NET

**Outcome:** a statically server-rendered diagram - no JavaScript interop, identical
output in static SSR and interactive modes.

1. **Pack the NuGet packages** (from a FlowInk clone):

   ```bash
   dotnet pack dotnet/src/FlowInk.Core -o /tmp/packs
   dotnet pack dotnet/src/FlowInk.Blazor -o /tmp/packs
   ```

2. **Expose a local feed and reference the package.** In your app folder:

   ```bash
   mkdir nuget-feed && cp /tmp/packs/*.nupkg nuget-feed/
   dotnet add package FlowInk.Blazor --version 0.1.1
   ```

   with a `nuget.config` beside the project:

   ```xml
   <configuration>
     <packageSources>
       <clear />
       <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
       <add key="flowink-local" value="./nuget-feed" />
     </packageSources>
   </configuration>
   ```

3. **Add usings** to `Components/_Imports.razor`:

   ```razor
   @using FlowInk.Core
   @using FlowInk.Blazor
   ```

4. **Write the spec in natural C#** - `Pulse = true` and `Pulse = 2400` both work
   (implicit conversions; see [findings F2](findings-first-consumer-validation.md)):

   ```razor
   <FlowDiagram Spec="spec" />

   @code {
       private FlowSpec spec { get; } = new()
       {
           Title = "Sample - checkout order flow",
           Nodes = new List<FlowNode>
           {
               new() { Id = "web", Label = "WEB APP", X = 40, Y = 300 },
               new() { Id = "api", Label = "API", X = 420, Y = 300, Pulse = true },
           },
           Edges = new List<FlowEdge>
           {
               new() { From = "web", To = "api", Label = "POST /orders", Packet = true },
           },
       };
   }
   ```

   JSON specs work too: `FlowRenderer.ParseSpecJson(await File.ReadAllTextAsync(path))`.

5. **Verify:** `dotnet build` then run; view source - the static HTML contains the
   `<svg>` with `fi-dark-…` classes and zero `<animate>`.

**Notes:** local feeds cache by exact version - bump the package version (or clear
the global packages cache) when iterating against a rebuilt local package
([findings F4](findings-first-consumer-validation.md)).
