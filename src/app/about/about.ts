import { Component, computed, inject, PendingTasks } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

const data = [
  {
    name: 'foo',
    label: 'lorem ipsum'
  },
    {
    name: 'bar',
    label: 'dolar emit phee'
  },
] as const;

@Component({
  selector: 'app-about',
  imports: [],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class AboutComponent {
  route = inject(ActivatedRoute);
  routeParams = toSignal(this.route.params);

  data = computed(() => {
    const params = this.routeParams();
    if(params) {
      console.log(`params`, params);
      return data.find((x) => x.name === params['name']);
    }
    return null;
  });

  code = `
{
  path: '**',
  renderMode: RenderMode.Server
},
  `;

}
