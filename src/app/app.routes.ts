import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { AboutComponent } from './about/about';
import { OtherComponent } from './other/other';

export const routes: Routes = [
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'about/:name',
    component: AboutComponent,
  },
  {
    path: 'other',
    component: OtherComponent,
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
