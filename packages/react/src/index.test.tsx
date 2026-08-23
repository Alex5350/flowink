import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { FlowDiagram, renderFlowToString } from './index.js';
import type { FlowSpec } from '@flowink/core';

const spec: FlowSpec = {
  title: 'React smoke',
  nodes: [
    { id: 'a', label: 'A', x: 20, y: 100 },
    { id: 'b', label: 'B', x: 400, y: 100 },
  ],
  edges: [{ from: 'a', to: 'b', label: 'x' }],
};

describe('FlowDiagram (React)', () => {
  it('server-renders the SVG with no SMIL and the spec title', () => {
    const html = renderToString(React.createElement(FlowDiagram, { spec }));
    expect(html).toContain('<svg');
    expect(html).toContain('React smoke');
    expect(html).not.toContain('<animate');
  });

  it('exposes the raw string renderer for build-time use', () => {
    const svg = renderFlowToString(spec);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('fi-dark-flow-sky');
  });
});
