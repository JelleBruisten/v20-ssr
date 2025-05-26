import { Component, inject, PendingTasks } from '@angular/core';

@Component({
  selector: 'app-contact',
  imports: [],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class ContactComponent {
  // add a PendingTask
  task = inject(PendingTasks).add();


  constructor() {
    setTimeout(() => {
      console.log("Long pending task is done, ready for render!");
      this.task()
    }, 2000);
  }

  code = `
  // add a pendingTask
  task = inject(PendingTasks).add();


  constructor() {
    // after 2 seconds mark task as done
    setTimeout(() => {
      console.log("Long pending task is done, ready for render!");

      // mark task as done
      this.task()
    }, 2000);
  }`
}
