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
