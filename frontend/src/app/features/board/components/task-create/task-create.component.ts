import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../workspace.store';

@Component({
    selector: 'app-task-create',
    imports: [FormsModule],
    templateUrl: './task-create.component.html',
    styles: [':host { display: block; min-width: 0; }']
})
export class TaskCreateComponent {
  readonly vm = inject(WorkspaceStore);
}
