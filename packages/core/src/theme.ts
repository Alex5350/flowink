/** Per-theme tokens: colors for canvas, nodes, text, flows. */
export interface Theme {
  canvas: string;
  dot: string;
  nodeFill: string;
  nodeStroke: string;
  title: string;
  subtitle: string;
  nodeText: string;
  bodyText: string;
  label: string;
  edge: string;
  chipStroke: string;
  flows: Record<'sky' | 'emerald' | 'amber' | 'rose', string>;
  packet: string;
}

export const dark: Theme = {
  canvas: '#0B1118',
  dot: '#1B2737',
  nodeFill: '#0E1620',
  nodeStroke: '#22304A',
  title: '#E2E8F0',
  subtitle: '#64748B',
  nodeText: '#E2E8F0',
  bodyText: '#94A3B8',
  label: '#64748B',
  edge: '#1F2B3D',
  chipStroke: '#38BDF8',
  flows: { sky: '#38BDF8', emerald: '#34D399', amber: '#F59E0B', rose: '#F87171' },
  packet: '#7DD3FC',
};

export const light: Theme = {
  canvas: '#F8FAFC',
  dot: '#E2E8F0',
  nodeFill: '#FFFFFF',
  nodeStroke: '#CBD5E1',
  title: '#0F172A',
  subtitle: '#64748B',
  nodeText: '#0F172A',
  bodyText: '#475569',
  label: '#64748B',
  edge: '#CBD5E1',
  chipStroke: '#0284C7',
  flows: { sky: '#0284C7', emerald: '#059669', amber: '#D97706', rose: '#DC2626' },
  packet: '#0EA5E9',
};
