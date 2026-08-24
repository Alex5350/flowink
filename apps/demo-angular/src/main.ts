import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { FlowDiagramComponent } from '@flowink/angular';
import type { FlowSpec } from '@flowink/core';

const spec: FlowSpec = {
  title: 'FlowInk in Angular',
  subtitle: 'standalone component · OnPush · SSR-compatible markup',
  nodes: [
    { id: 'ng', label: 'ANGULAR COMPONENT', lines: ['<flowink-diagram', '[spec]="spec" />'], x: 60, y: 320, pulse: true },
    { id: 'core', label: '@FLOWINK/CORE', lines: ['renderFlow(spec)'], x: 480, y: 320 },
    { id: 'svg', label: 'ANIMATED SVG', lines: ['CSS-only', 'README-safe'], x: 880, y: 320, pulse: true },
  ],
  edges: [
    { from: 'ng', to: 'core', label: 'spec', color: 'sky' },
    { from: 'core', to: 'svg', label: 'svg string', color: 'sky', packet: true },
  ],
};

@Component({
  standalone: true,
  imports: [FlowDiagramComponent],
  selector: 'app-root',
  template: `<main style="font-family: system-ui; padding: 16px">
    <flowink-diagram [spec]="spec" />
  </main>`,
})
export class AppComponent {
  readonly spec = spec;
}

bootstrapApplication(AppComponent).catch((err) => console.error(err));
