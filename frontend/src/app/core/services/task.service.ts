import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TaskFilter, TaskItem, TaskPriority, TaskStatus } from '../models/models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  constructor(private http: HttpClient) {}

  private baseUrl(projectId: string): string {
    return `${environment.apiUrl}/projects/${projectId}/tasks`;
  }

  getAll(projectId: string, filter: TaskFilter = {}): Promise<TaskItem[]> {
    let params = new HttpParams();
    if (filter.search) params = params.set('search', filter.search);
    if (filter.status !== undefined) params = params.set('status', filter.status);
    if (filter.assigneeId) params = params.set('assigneeId', filter.assigneeId);
    if (filter.labelId) params = params.set('labelId', filter.labelId);

    return firstValueFrom(this.http.get<TaskItem[]>(this.baseUrl(projectId), { params }));
  }

  create(
    projectId: string,
    title: string,
    description: string | undefined,
    priority: TaskPriority,
    planning: Partial<TaskItem> = {}
  ): Promise<TaskItem> {
    return firstValueFrom(
      this.http.post<TaskItem>(this.baseUrl(projectId), { title, description, priority, ...planning })
    );
  }

  update(
    projectId: string,
    taskId: string,
    title: string,
    description: string | undefined,
    priority: TaskPriority,
    assigneeId?: string | null,
    planning: Partial<TaskItem> = {}
  ): Promise<TaskItem> {
    return firstValueFrom(
      this.http.put<TaskItem>(`${this.baseUrl(projectId)}/${taskId}`, {
        title,
        description,
        priority,
        assigneeId,
        sprintId: planning.sprintId ?? null,
        issueType: planning.issueType ?? 0,
        storyPoints: planning.storyPoints ?? null,
        dueDate: planning.dueDate || null
      })
    );
  }

  move(projectId: string, taskId: string, status: TaskStatus, order: number): Promise<TaskItem> {
    return firstValueFrom(
      this.http.patch<TaskItem>(`${this.baseUrl(projectId)}/${taskId}/move`, { status, order })
    );
  }

  setLabels(projectId: string, taskId: string, labelIds: string[]): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.baseUrl(projectId)}/${taskId}/labels`, labelIds));
  }

  delete(projectId: string, taskId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl(projectId)}/${taskId}`));
  }
}
