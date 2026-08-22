# @flowink/angular

Standalone Angular component for FlowInk diagrams.

```ts
import { FlowDiagramComponent } from '@flowink/angular';

@Component({
  imports: [FlowDiagramComponent],
  template: `<flowink-diagram [spec]="spec" />`,
})
export class Shell { spec = myFlowSpec; }
```
