import { Component, OnInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkspaceStore } from './workspace.store';
import { TaskCreateComponent } from './components/task-create/task-create.component';
import { SprintFormComponent } from './components/sprint-form/sprint-form.component';
import { ProjectSummaryComponent } from './components/project-summary/project-summary.component';
import { TaskFiltersComponent } from './components/task-filters/task-filters.component';
import { KanbanBoardComponent } from './components/kanban-board/kanban-board.component';
import { SprintPlanningComponent } from './components/sprint-planning/sprint-planning.component';
import { TaskGridComponent } from './components/task-grid/task-grid.component';
import { ProjectTeamComponent } from './components/project-team/project-team.component';

@Component({
    selector: 'app-board',
    providers: [WorkspaceStore],
    imports: [
        RouterLink,
        TaskCreateComponent,
        SprintFormComponent,
        ProjectSummaryComponent,
        TaskFiltersComponent,
        KanbanBoardComponent,
        SprintPlanningComponent,
        TaskGridComponent,
        ProjectTeamComponent
    ],
    templateUrl: './board.component.html',
    styleUrl: './board.component.scss',
    // Shared workspace styles are explicitly scoped under app-board.
    encapsulation: ViewEncapsulation.None
})
export class BoardComponent implements OnInit, OnDestroy {
  readonly vm = inject(WorkspaceStore);
  ngOnInit() {
    void this.vm.initialize();
  }
  ngOnDestroy() {
    this.vm.dispose();
  }
}
