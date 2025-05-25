import { RenderMode, ServerRoute } from '@angular/ssr';
import { routes } from './app.routes';
import { AboutComponent } from './about/about';
import { HomeComponent } from './home/home';
import { OtherComponent } from './other/other';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'home',
    renderMode: RenderMode.Client
  },
  // {
  //   path: 'about',
  //   renderMode: RenderMode.Server
  // },
  // {
  //   path: 'other',
  //   renderMode: RenderMode.Server
  // },

  {
    path: '**',
    renderMode: RenderMode.Server
  },
];
