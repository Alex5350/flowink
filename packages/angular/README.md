![FlowInk](./logo.svg)

# @flowink/angular

Standalone OnPush Angular component for FlowInk animated flow diagrams.
ng-packagr compiled (FESM2022 + types) - consumable from any Angular 16+ app.

```ts
import { FlowDiagramComponent } from "@flowink/angular";

@Component({
  standalone: true,
  imports: [FlowDiagramComponent],
  template: `<flowink-diagram [spec]="spec" />`,
})
```

Peer deps: `@flowink/core`, `@angular/core`, `@angular/platform-browser`.
Full docs: [the FlowInk repo](https://github.com/Alex5350/flowink).
