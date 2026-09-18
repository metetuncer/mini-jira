import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../workspace.store';

@Component({
    selector: 'app-project-team',
    imports: [FormsModule],
    templateUrl: './project-team.component.html',
    styles: [':host { display: block; min-width: 0; }']
})
export class ProjectTeamComponent {
  readonly vm = inject(WorkspaceStore);
}
