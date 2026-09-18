import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { WorkspaceStore } from '../../workspace.store';

@Component({
    selector: 'app-kanban-board',
    imports: [CommonModule, FormsModule, DragDropModule],
    templateUrl: './kanban-board.component.html',
    styles: [':host { display: block; min-width: 0; }']
})
export class KanbanBoardComponent {
  readonly vm = inject(WorkspaceStore);
}
