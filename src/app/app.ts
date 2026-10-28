import { Component } from '@angular/core';
import { DynamicForm } from './dynamic-form/dynamic-form';

@Component({
  selector: 'app-root',
  imports: [DynamicForm],
  template: `
    <main>
      <h1>Dynamic form</h1>
      <app-dynamic-form />
    </main>
  `,
  styles: `
    main {
      max-width: 560px;
      margin: 2rem auto;
      padding: 0 16px;
    }
  `,
})
export class App {}
