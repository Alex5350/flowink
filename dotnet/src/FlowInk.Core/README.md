![FlowInk](https://raw.githubusercontent.com/Alex5350/flowink/main/docs/icon.png)

# FlowInk.Core

C# renderer for FlowInk animated flow diagrams - a JSON spec (or typed `FlowSpec`)
renders to the identical CSS-only SVG the TypeScript core produces, held to
**byte parity** by a golden-fixture test suite. SMIL-free by construction (safe for
GitHub README `<img>` embedding), `prefers-reduced-motion` honored, all spec text
escaped and bounds-checked.

```csharp
var spec = FlowRenderer.ParseSpecJson(json);
var svg = FlowRenderer.Render(spec);
```

Natural C# authoring throughout - `Pulse = true`, `Pulse = 2400` both work.
Full docs: https://github.com/Alex5350/flowink
