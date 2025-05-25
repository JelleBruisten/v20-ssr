import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { OtherHydrationComponent } from "./other-hydration";

@Component({
  selector: 'app-other',
  imports: [OtherHydrationComponent],
  templateUrl: './other.html',
  styleUrl: './other.css'
})
export class OtherComponent {

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
}
