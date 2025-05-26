import { isPlatformBrowser } from "@angular/common";
import { ChangeDetectorRef, Component, inject, input, OnInit, PLATFORM_ID } from "@angular/core";

@Component({
  selector: 'app-other-hydrate',
  template: `
    <p>
      @if(isBrowser) {
        Rendered on Client ( Hydrated )
      } @else {
        Rendered on server
      }
    </p>`,
  host: {
    '[style.background]': 'isBrowser ? "deepskyblue": "orange"'
  }
})
export class OtherHydrationComponent implements OnInit {
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  type = input.required<string>();

  ngOnInit(): void {
    console.log(`[app-other-hydrate]: I'm Hydrated on ${this.type()}`)
  }
}
