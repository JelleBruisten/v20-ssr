import { Component } from "@angular/core";

@Component({
  selector: 'app-other-hydrate',
  template: `<p>Other hydration works!</p>`
})
export class OtherHydrationComponent {
  constructor() {
    console.log("hello from OtherHydration");
  }
}
