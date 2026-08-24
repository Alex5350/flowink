import { describe, expect, it } from 'vitest';
import { renderFlow } from './render.js';
import type { FlowSpec } from './spec.js';

const demoSpec: FlowSpec = {
  title: 'Demo — request flow',
  subtitle: 'sky = requests · emerald = auth',
  chip: 'css-only animation',
  nodes: [
    { id: 'client', label: 'CLIENT', lines: ['browser', 'fetches data'], x: 40, y: 300 },
    { id: 'api', label: 'API', lines: ['ASP.NET Core'], x: 400, y: 300, pulse: true },
    { id: 'db', label: 'DATABASE', x: 800, y: 300 },
    { id: 'auth', label: 'AUTH', lines: ['JWT issuer'], x: 400, y: 80 },
  ],
  edges: [
    { from: 'client', to: 'api', label: 'https', color: 'sky' },
    { from: 'api', to: 'db', label: 'query', color: 'sky', packet: true },
    { from: 'client', to: 'auth', label: 'login', color: 'emerald', direction: 'backward' },
  ],
};

describe('renderFlow', () => {
  const svg = renderFlow(demoSpec);

  it('produces a self-contained SVG document with title for a11y', () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('<title>Demo — request flow</title>');
    expect(svg).toContain('role="img"');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('NEVER emits SMIL elements (the GitHub <img> killer)', () => {
    expect(svg).not.toContain('<animate');
    expect(svg).not.toContain('<animateMotion');
    expect(svg).not.toContain('<animateTransform');
  });

  it('emits CSS keyframe flows for every color and reduced-motion opt-out', () => {
    for (const color of ['sky', 'emerald', 'amber', 'rose']) {
      expect(svg).toContain(`@keyframes fi-dark-dash-${color}-f`);
      expect(svg).toContain(`.fi-dark-flow-${color} {`);
    }
    expect(svg).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('renders nodes with labels, detail lines, and pulse classes', () => {
    expect(svg).toContain('>CLIENT</text>');
    expect(svg).toContain('>browser</text>');
    expect(svg).toContain('class="fi-dark-node fi-dark-pulse"');
  });

  it('renders edges with semantic colors, direction, labels, and packets', () => {
    expect(svg).toContain('class="fi-dark-flow-sky"');
    expect(svg).toContain('class="fi-dark-flow-emerald fi-dark-flow-sky-b fi-dark-flow-emerald-b fi-dark-flow-amber-b fi-dark-flow-rose-b"');
    expect(svg).toContain('>https</text>');
    expect(svg).toContain(">query</text>");
    expect(svg).toContain('class="fi-dark-packet"');
    expect(svg).toContain("offset-path: path('M");
  });

  it('connects horizontally aligned boxes with straight segments', () => {
    expect(svg).toMatch(/class="fi-dark-flow-sky"[^/]*d="M\d+,\d+ H\d+"/);
  });

  it('escapes XML in user text', () => {
    const hostile = renderFlow({
      title: 'T <script>alert("x")</script>',
      nodes: [{ id: 'a', label: 'A & B', lines: ['"quoted" <ok>'], x: 10, y: 100 }],
      edges: [],
    });
    expect(hostile).not.toContain('<script>');
    expect(hostile).toContain('&lt;script&gt;');
    expect(hostile).toContain('A &amp; B');
  });

  it('supports the light theme', () => {
    const light = renderFlow({ ...demoSpec, theme: 'light' });
    expect(light).toContain('fill="#F8FAFC"');
    expect(light).toContain('.fi-light-flow-sky');
  });

  it('rejects edges that reference unknown nodes', () => {
    expect(() =>
      renderFlow({
        title: 'x',
        nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
        edges: [{ from: 'a', to: 'ghost' }],
      }),
    ).toThrow(/unknown node/i);
  });

  it('rejects duplicate node ids', () => {
    expect(() =>
      renderFlow({
        title: 'x',
        nodes: [
          { id: 'a', label: 'A', x: 0, y: 0 },
          { id: 'a', label: 'A2', x: 100, y: 0 },
        ],
        edges: [],
      }),
    ).toThrow(/duplicate/i);
  });
});

describe('host-CSS isolation (the css-war guarantee)', () => {
  it('puts every paint-critical property inline with !important', () => {
    const svg = renderFlow(demoSpec);
    // Fills/strokes/fonts must survive host rules like `svg rect { fill: teal !important }`:
    // only inline !important outranks host !important.
    const nodeRect = svg.match(/<rect class="fi-dark-node[^>]*>/)![0];
    expect(nodeRect).toContain('style="fill: #0E1620 !important');
    expect(nodeRect).toContain('stroke: #22304A !important');
    const flowPath = svg.match(/<path class="fi-dark-flow-sky"[^>]*>/)![0];
    expect(flowPath).toContain('stroke: #38BDF8 !important');
    const label = svg.match(/<text[^>]*>https<\/text>/)![0];
    expect(label).toContain('!important');
  });
});

describe('malicious-spec resistance (the injection boundary)', () => {
  const evil: Record<string, unknown> = {
    title: 'T <script>alert(0)</script>',
    width: '1200"><script>alert(1)</script>',
    nodes: [
      { id: 'a', label: '<img src=x onerror=alert(9)>', x: 10, y: 10 },
      { id: 'b', label: 'B', lines: ['</text><script>alert(5)</script>'], x: 400, y: 10 },
    ],
    edges: [
      {
        from: 'a',
        to: 'b',
        path: 'M0,0 H10"/><script>alert(3)</script><rect onload=alert(4) />',
        label: '"><script>alert(6)</script>',
      },
    ],
  };

  it('escapes every field: no script elements, no handler attributes', () => {
    const svg = renderFlow(evil as never);
    expect(svg).not.toMatch(/<script[\s>]/);
    // on*= must not appear as markup (escaped text inside attributes is fine)
    expect(svg.replace(/&lt;[^&]*&gt;/g, '')).not.toMatch(/\son\w+\s*=/);
  });

  it('coerces smuggled string numerics to safe integers', () => {
    const svg = renderFlow(evil as never);
    expect(svg).toMatch(/<svg[^>]*width="1200"/);
  });


});

describe('resource bounds and fuzz', () => {
  it('rejects node floods before rendering (server-side DoS guard)', () => {
    const nodes = Array.from({ length: 501 }, (_, i) => ({ id: `n${i}`, label: 'N', x: i, y: 0 }));
    expect(() => renderFlow({ title: 'flood', nodes, edges: [] })).toThrow(/limit is 500/);
  });

  it('rejects edge floods and runaway line counts with clear errors', () => {
    const nodes = [{ id: 'a', label: 'A', x: 0, y: 0 }];
    const edges = Array.from({ length: 1001 }, (_, i) => ({ from: 'a', to: 'a', key: i }));
    expect(() => renderFlow({ title: 'x', nodes, edges })).toThrow(/limit is 1000/);
    expect(() =>
      renderFlow({ title: 'x', nodes: [{ id: 'a', label: 'A', lines: Array.from({ length: 13 }, () => 'x'), x: 0, y: 0 }], edges: [] }),
    ).toThrow(/detail lines/);
  });

  it('fails clearly on malformed specs (missing arrays) instead of TypeErrors', () => {
    expect(() => renderFlow({ title: 'x' } as never)).toThrow(/nodes and edges arrays/);
  });

  // Deterministic fuzz: seeded PRNG, no dependencies — 300 randomized specs with
  // hostile payloads in every field must never produce script markup.
  it('fuzz: 300 randomized hostile specs yield no script markup', () => {
    let seed = 0x2f6e2b1;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const payloads = [
      '"><script>alert(1)</script>',
      "'/><rect onload=alert(2)/>",
      '</text><foreignObject><body xmlns=...',
      'M0,0"/><circle onbegin=alert(3)>',
      String.fromCharCode(0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3e),
      'javascript:alert(4)',
    ];
    for (let i = 0; i < 300; i++) {
      const pick = () => payloads[Math.floor(rand() * payloads.length)];
      const num = () => (rand() < 0.5 ? String(rand() * 1200) : Math.floor(rand() * 1200)) as unknown as number;
      const svg = renderFlow({
        title: pick(),
        subtitle: pick(),
        chip: pick(),
        width: num(),
        nodes: Array.from({ length: 1 + Math.floor(rand() * 3) }, (_, n) => ({
          id: `n${n}`,
          label: pick(),
          lines: [pick()],
          x: num(),
          y: num(),
        })),
        edges: [{ from: 'n0', to: 'n0', label: pick(), path: pick() }],
      });
      expect(svg).not.toMatch(/<script[\s>]/i);
      expect(svg.replace(/&lt;[^&]*&gt;/g, '')).not.toMatch(/\son\w+\s*=/i);
    }
  });
});
