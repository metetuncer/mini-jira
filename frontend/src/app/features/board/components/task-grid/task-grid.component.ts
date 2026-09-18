import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../workspace.store';

@Component({
    selector: 'app-task-grid',
    imports: [CommonModule, FormsModule],
    templateUrl: './task-grid.component.html',
    styles: [':host { display: block; min-width: 0; }']
})
export class TaskGridComponent {
  readonly vm = inject(WorkspaceStore);
}
