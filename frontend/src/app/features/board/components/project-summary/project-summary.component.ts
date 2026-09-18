import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../workspace.store';

@Component({
    selector: 'app-project-summary',
    imports: [CommonModule, FormsModule],
    templateUrl: './project-summary.component.html',
    styles: [':host { display: block; min-width: 0; }']
})
export class ProjectSummaryComponent {
  readonly vm = inject(WorkspaceStore);
}
