![FlowInk](https://raw.githubusercontent.com/Alex5350/flowink/main/docs/icon.png)

# FlowInk.Blazor

Blazor component for FlowInk animated flow diagrams. Static SSR renders the SVG
into the HTML - no JavaScript interop, identical output in every render mode.

```razor
<FlowDiagram Spec="spec" />
@code {
    FlowSpec spec = new() {
        Title = "Checkout flow",
        Nodes = [ new() { Id = "a", Label = "WEB", X = 40, Y = 300 } ],
        Edges = [ new() { From = "a", To = "a", Packet = true } ],
    };
}
```

Depends on FlowInk.Core. Full docs: https://github.com/Alex5350/flowink
