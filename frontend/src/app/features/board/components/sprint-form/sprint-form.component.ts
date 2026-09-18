import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../workspace.store';

@Component({
    selector: 'app-sprint-form',
    imports: [FormsModule],
    templateUrl: './sprint-form.component.html',
    styles: [':host { display: block; min-width: 0; }']
})
export class SprintFormComponent {
  readonly vm = inject(WorkspaceStore);
}
