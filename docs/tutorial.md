# Building an animated architecture-flow SVG, step by step

This is the granular walkthrough of how the animated diagrams in my portfolio READMEs
are made - first by hand, so every mechanism is visible, then with FlowInk, which
automates exactly these steps. Every rule below was learned by shipping the mistake
first; the "why" of each step is usually a failure that actually happened.

Work through it with a text editor and a browser - no tools, no libraries.

---

## Part 0 - Know the rendering context before you draw anything

The destination is a GitHub README, and GitHub renders README images as `<img>` tags
through its media proxy. That single fact imposes the rules everything else follows:

| Constraint | Consequence |
|---|---|
| `<img>` contexts run no JavaScript | No animation libraries, no runtime logic |
| SVG-as-image is sandboxed from external loads | No external fonts, no CSS imports, no fetched assets |
| **Chromium refuses to paint SVG-as-image when SMIL (`<animate>`) coexists with a `<style>` block** | Animation must be **CSS-only** - this is the trap that made four of my repos show empty boxes where diagrams belonged |
| Animation should respect user preference | `prefers-reduced-motion` support is non-negotiable |

That third row deserves emphasis because it is the counter-intuitive one: SMIL is the
"obvious" SVG animation tool, an SVG containing *only* SMIL often renders fine, and an
SVG containing *only* CSS renders fine - the combination silently produces a blank
image. If you remember one thing from this tutorial, remember that.

**Verification habit for everything that follows:** never trust a direct browser tab.
Always test the file inside an actual `<img>` element:

```html
<!doctype html>
<html><body style="margin:0">
  <h1 style="background:red;color:#fff">IMG CONTEXT TEST</h1>
  <img src="http://localhost:8080/diagram.svg" style="width:50%;border:4px solid blue">
  <h2 style="background:lime">after</h2>
</body></html>
```

Serve it (`python3 -m http.server`), load the page, and screenshot *that*. The red and
lime banners guarantee the page itself rendered, so a blank region between them is a
diagram failure, not a test failure.

---

## Part 1 - The static skeleton

Start with a fixed coordinate system and the document furniture:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640"
     viewBox="0 0 1200 640" role="img" aria-label="One-sentence description of the diagram">
  <title>Short title</title>
  <defs>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="#1B2737"/>
    </pattern>
  </defs>
  <rect width="1200" height="640" fill="#0B1118"/>
  <rect width="1200" height="640" fill="url(#dots)" opacity=".5"/>
</svg>
```

Decisions baked in here:

- **Fixed `width`/`height` + matching `viewBox`** - the diagram scales cleanly to any
  column width and never reflows.
- **`role="img"` + `aria-label` + `<title>`** - an SVG-as-image is opaque to assistive
  tech; these are the only accessibility hooks you get, so write a real sentence.
- **The dot pattern** - a 24px tile with one 1px dot, layered at 50% over the base
  fill. This is what makes the canvas read as "engineered" instead of "flat dark
  rectangle." Two rects total; it is the highest visual-ROI element in the file.
- **Palette** - dark navy canvas `#0B1118`, node fill `#0E1620`, node stroke `#22304A`.
  Text: `#E2E8F0` titles, `#94A3B8` body, `#64748B` muted. These come from the Slate
  ramp and never fight the flows you'll add later.

Add a title and subtitle as plain `<text>`:

```xml
<text x="40" y="46" style="font: 600 20px ui-sans-serif, system-ui, sans-serif"
      fill="#E2E8F0">System name - how a request flows</text>
<text x="40" y="68" style="font: 12px ui-monospace, SFMono-Regular, Menlo, monospace"
      fill="#64748B">requests in sky · auth in emerald · telemetry in amber</text>
```

Note the fonts: **system stacks only** (`ui-monospace`, `ui-sans-serif`), because the
`<img>` sandbox cannot load Inter/JetBrains/whatever. Any font you can't guarantee is
a font that silently falls back anyway - pick the fallback on purpose.

---

## Part 2 - Nodes: boxes that size from their content

A node is a rounded rect plus text lines with fixed offsets:

```xml
<g>
  <rect x="278" y="288" width="192" height="84" rx="12" fill="#0E1620" stroke="#22304A" stroke-width="1.2"/>
  <text x="298" y="314" style="font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="#E2E8F0">ASPIRE APPHOST</text>
  <text x="298" y="334" style="font: 11px ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="#94A3B8">spawns API + SPA as resources</text>
  <text x="298" y="350" style="font: 11px ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="#94A3B8">injects PORT · watches health</text>
</g>
```

The offset recipe (derived, use it for every node):

- label baseline: `y + 26`
- first detail line: `y + 48`, then `+18` per line
- left padding: `x + 20`
- width: `max(160, ceil(longest_text × 7.2) + 40)` - 7.2px is a safe per-character
  estimate for 13px monospace
- height: `max(64, 40 + lines × 18 + 8)`

Uppercase labels + monospace + a `letter-spacing: .5px` is the "system diagram" voice;
sentence-case body lines keep it readable. Keep vocabulary consistent: **node titles
are systems, detail lines are responsibilities.**

Lay nodes out on a rough grid: primary request path along one horizontal band (y≈290),
satellite concerns above/below. Leave ≥60px between boxes for edges and labels - the
diagram breathes through its gaps, not its boxes.

---

## Part 3 - The flow: dashes that march

Here is the entire "animation" technique, the thing people think requires a library:

```css
.flow-sky {
  stroke: #38BDF8;
  stroke-width: 2;
  fill: none;
  stroke-dasharray: 5 11;   /* 5px dash, 11px gap */
  animation: dash-sky 1.5s linear infinite;
}
@keyframes dash-sky { to { stroke-dashoffset: -16; } }
```

```xml
<style>…the CSS above…</style>
<path class="flow-sky" d="M180,330 H470"/>
```

Why the numbers work:

- `stroke-dasharray: 5 11` makes the stroke a dotted sequence with **period 16**
  (5 dash + 11 gap).
- Animating `stroke-dashoffset` to **exactly `-16`** over one cycle slides the pattern
  left by exactly one period per loop - the loop is seamless. Any other magnitude
  makes the animation visibly jump on wrap. (This is the arithmetic people get wrong:
  the dashoffset target must equal the dash period.)
- Negative offset moves dashes in the path's draw direction; **positive moves them
  backward** - that's your bidirectional flow for free (`to { stroke-dashoffset: 16 }`).

Draw each edge twice - once as a static base, once as the animated overlay:

```xml
<path class="edge"  d="M180,330 H470"/>   <!-- static #1F2B3D, always visible -->
<path class="flow-sky" d="M180,330 H470"/> <!-- animated color on top -->
```

The base guarantees the connection survives even where animation is frozen
(reduced-motion, thumbnailers, some mail clients).

### Edge geometry

Between aligned boxes, straight segments are king: `M470,330 H560` (horizontal) or
`M515,184 V268` (vertical). When endpoints misalign, one cubic curve with vertical
control handles keeps the "circuit" look:

```
M startX,startY C midX,startY midX,endY endX,endY    (horizontal facing)
M startX,startY C startX,midY endX,midY endX,endY    (vertical facing)
```

`midX`/`midY` = midpoint of the span. One curve per edge; never chain beziers.

### The color grammar

Flows carry meaning, so fix a legend and keep it across every diagram you make:

| Color | Hex | Meaning |
|---|---|---|
| sky | `#38BDF8` | the primary request path |
| emerald | `#34D399` | authentication / identity |
| amber | `#F59E0B` | secondary integrations (Teams, AI, circuits) |
| rose | `#F87171` | fallback / degradation paths |

Print the legend as a subtitle line. A colored line without a legend is decoration;
with one, it's information.

### Edge labels

Small monospace text at the path midpoint, in the flow's color, lifted 8px above the
line so descenders don't collide with dashes. For manual placement, find the midpoint
by eye, then nudge until it clears both the line and neighboring boxes - expect two or
three adjustment passes; that's normal and worth it.

---

## Part 4 - Pulses and the riding packet

Two garnishes, both pure CSS:

**Node breathing** - a slow opacity oscillation on the stroke says "live system"
without distracting:

```css
.pulse { animation: pulse 3s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { stroke-opacity: 1; } 50% { stroke-opacity: .5; } }
```

Apply to 2-4 *key* nodes only (the orchestrator, the database). Pulsing everything is
visual noise; the eye needs a majority of stillness to notice motion.

**The packet** - a dot that physically travels one edge. CSS Motion Path:

```xml
<circle class="packet" r="3.5" fill="#7DD3FC"
        style="offset-path: path('M180,338 H470')"/>
```

```css
.packet { animation: ride 1.5s linear infinite; }
@keyframes ride { from { offset-distance: 0%; } to { offset-distance: 100%; } }
```

`offset-path` takes the *same path data* as the edge; `offset-distance` animates the
circle along it. One packet, on the single most important edge. (If you found this
tutorial after trying `<animateMotion>` and getting a blank image in GitHub - this
line is its CSS-only replacement.)

---

## Part 5 - Accessibility close-out

1. **`prefers-reduced-motion`** - freeze everything:

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
}
```

2. **Never encode meaning in motion alone.** The dash direction shows request vs
   response; the label says which is which. Motion is enhancement, never the channel.
3. Re-check `role="img"` + `aria-label` describe the *diagram*, not the animation.
4. Contrast: node text `#E2E8F0` on `#0E1620` and flow labels on canvas both clear
   WCAG AA; if you retint, keep ≥4.5:1 for text.

---

## Part 6 - The SMIL trap, formally

For the record, the defect this whole approach exists to avoid:

- SVG with `<style>` + SMIL `<animate>`/`<animateMotion>` → **Chromium's SVG-as-image
  path paints nothing.** Direct navigation renders fine, which is why it survives
  casual testing.
- Either alone renders fine. The combination is the kill condition.
- GitHub READMEs are an `<img>` context → blank box.

Detection protocol (run it for every diagram you ship):

1. XML-validate the file.
2. `grep -c '<animate' diagram.svg` → must be `0`.
3. Render through the Part 0 img-context page; screenshot; require the banners *and*
   the diagram.
4. After pushing: fetch the raw URL and grep the served bytes - proxies should never
   change this, but verify the artifact, then verify the delivery.

---

## Part 7 - Stop hand-writing: FlowInk

Everything above is mechanical once decided - coordinates excepted. FlowInk encodes
the rules so the diagram becomes data:

```json
{
  "title": "Checkout - how an order flows",
  "subtitle": "requests in sky · payments in amber",
  "chip": "css-only animation",
  "nodes": [
    { "id": "web",   "label": "WEB APP",    "lines": ["cart UI"],        "x": 40,  "y": 300 },
    { "id": "api",   "label": "API",        "lines": ["REST handlers"],  "x": 420, "y": 300, "pulse": true },
    { "id": "stripe","label": "STRIPE",     "lines": ["payment intents"],"x": 800, "y": 300 },
    { "id": "auth",  "label": "AUTH",       "lines": ["session tokens"], "x": 420, "y": 90 }
  ],
  "edges": [
    { "from": "web", "to": "api", "label": "POST /orders", "color": "sky", "packet": true },
    { "from": "api", "to": "stripe", "label": "charge", "color": "amber" },
    { "from": "web", "to": "auth", "label": "login", "color": "emerald", "direction": "backward" }
  ]
}
```

```bash
npx flowink render checkout.json          # -> checkout.svg
```

The renderer emits exactly what Parts 1-5 prescribed: double-drawn edges, seam-safe
dash math, label midpoints, sized nodes, the reduced-motion block, and - structurally,
by construction - **zero SMIL**. Coordinates stay manual (deliberately: at ~10 nodes,
judgment beats auto-layout). Use the CLI for committed README art, the React/Angular
components for live docs pages, the Blazor component for .NET apps, and the C#
renderer anywhere JSON specs already live.

---

## Part 8 - Embedding lessons (the boring failures)

- **Reference the file from the README and verify the *reference*** - a pushed diagram
  with a silently-failed README insertion is invisible (yes, this happened: a string
  replace that didn't match, no error, unreferenced file).
- **Paths are cache keys.** When you must fix a broken image, prefer a new filename -
  GitHub's image pipeline and browsers cache per path, and republishing corrected
  bytes under the same name can serve the stale artifact to logged-in browsers.
- **Size images near their display width** (~880px for a README column) so the image
  pipeline never has to rescale - rescaling is where its bugs live.
- Commit-pinned raw URLs (`raw.githubusercontent.com/<org>/<repo>/<sha>/path`) are
  immutable and cache-cold: the right links for verification and for sharing.

---

## Recap

1. Fix the rendering context's rules first (no JS, no SMIL+CSS, no external fonts).
2. Static skeleton: fixed viewBox, dot-pattern canvas, system fonts, a11y metadata.
3. Nodes: content-sized rects on a grid with breathing room.
4. Flows: dash pattern whose period equals the dashoffset target; static base +
   animated overlay; four-color grammar with a printed legend.
5. Garnish: 2-4 pulses, one packet (CSS Motion Path).
6. Reduced-motion freeze; meaning never rides on motion alone.
7. Verify in a real `<img>` context - then verify the delivery path.
8. When it's mechanical, make it data: FlowInk.
