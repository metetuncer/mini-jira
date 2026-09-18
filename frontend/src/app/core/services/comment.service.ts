import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comment } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CommentService {
  constructor(private http: HttpClient) {}

  private baseUrl(projectId: string, taskId: string): string {
    return `${environment.apiUrl}/projects/${projectId}/tasks/${taskId}/comments`;
  }

  getAll(projectId: string, taskId: string): Promise<Comment[]> {
    return firstValueFrom(this.http.get<Comment[]>(this.baseUrl(projectId, taskId)));
  }

  add(projectId: string, taskId: string, content: string): Promise<Comment> {
    return firstValueFrom(this.http.post<Comment>(this.baseUrl(projectId, taskId), { content }));
  }

  delete(projectId: string, taskId: string, commentId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl(projectId, taskId)}/${commentId}`));
  }
}
