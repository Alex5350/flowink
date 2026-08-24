![FlowInk](./logo.svg)

# @flowink/core

Animated architecture-flow diagrams as data. A JSON spec (nodes + semantic-colored
edges) renders to a self-contained SVG - CSS-only animation, **SMIL-free by
construction**, safe for GitHub README `<img>` embedding, `prefers-reduced-motion`
honored. Zero runtime dependencies.

```ts
import { renderFlow, type FlowSpec } from "@flowink/core";

const svg = renderFlow({
  title: "Checkout - order flow",
  nodes: [
    { id: "web", label: "WEB APP", x: 40, y: 300 },
    { id: "api", label: "API", x: 420, y: 300, pulse: true },
  ],
  edges: [{ from: "web", to: "api", label: "POST /orders", color: "sky", packet: true }],
});
```

Security: all spec text XML-escaped and type-coerced at the sink (malicious-spec
regression tests pin zero script elements / handler attributes); resource bounds
cap floods. Full docs: [the FlowInk repo](https://github.com/Alex5350/flowink).
