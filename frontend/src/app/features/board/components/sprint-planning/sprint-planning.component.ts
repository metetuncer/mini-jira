import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../workspace.store';

@Component({
    selector: 'app-sprint-planning',
    imports: [CommonModule, FormsModule],
    templateUrl: './sprint-planning.component.html',
    styles: [':host { display: block; min-width: 0; }']
})
export class SprintPlanningComponent {
  readonly vm = inject(WorkspaceStore);
}
