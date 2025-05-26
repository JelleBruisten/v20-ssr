import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  code = `
{
  path: 'home',
  renderMode: RenderMode.Client
},
  `
}
