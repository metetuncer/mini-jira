import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../workspace.store';

@Component({
    selector: 'app-task-filters',
    imports: [FormsModule],
    templateUrl: './task-filters.component.html',
    styles: [':host { display: block; min-width: 0; }']
})
export class TaskFiltersComponent {
  readonly vm = inject(WorkspaceStore);
}
