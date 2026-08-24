![FlowInk](./logo.svg)

# flowink

CLI rendering animated architecture-flow SVGs from JSON specs - built for
committing diagrams to READMEs. **Zero runtime dependencies** (core bundled).

```bash
npx flowink render architecture.json        # -> architecture.svg
npx flowink render spec.json -o out.svg
```

The output embeds everything (styles, system fonts, CSS-only animation - never
SMIL, which GitHub's `<img>` context refuses to paint) and honors
`prefers-reduced-motion`. Commit both the spec and the SVG: spec is source,
SVG is the build artifact. Full docs:
[the FlowInk repo](https://github.com/Alex5350/flowink).
