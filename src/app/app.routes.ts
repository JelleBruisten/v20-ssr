import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { AboutComponent } from './about/about';
import { OtherComponent } from './other/other';
import { ContactComponent } from './contact/contact';

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
    path: 'contact',
    component: ContactComponent,
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
