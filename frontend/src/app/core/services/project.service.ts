import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Project, ProjectMember, ProjectRole } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly baseUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getMyProjects(): Promise<Project[]> {
    return firstValueFrom(this.http.get<Project[]>(this.baseUrl));
  }

  getById(projectId: string): Promise<Project> {
    return firstValueFrom(this.http.get<Project>(`${this.baseUrl}/${projectId}`));
  }

  create(name: string, description?: string): Promise<Project> {
    return firstValueFrom(this.http.post<Project>(this.baseUrl, { name, description }));
  }

  update(projectId: string, name: string, description?: string): Promise<Project> {
    return firstValueFrom(this.http.put<Project>(`${this.baseUrl}/${projectId}`, { name, description }));
  }

  delete(projectId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${projectId}`));
  }

  getMembers(projectId: string): Promise<ProjectMember[]> {
    return firstValueFrom(this.http.get<ProjectMember[]>(`${this.baseUrl}/${projectId}/members`));
  }

  addMember(projectId: string, email: string, role: ProjectRole): Promise<ProjectMember> {
    return firstValueFrom(
      this.http.post<ProjectMember>(`${this.baseUrl}/${projectId}/members`, { email, role })
    );
  }

  updateMemberRole(projectId: string, memberId: string, role: ProjectRole): Promise<ProjectMember> {
    return firstValueFrom(
      this.http.put<ProjectMember>(`${this.baseUrl}/${projectId}/members/${memberId}`, { role })
    );
  }

  removeMember(projectId: string, memberId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${projectId}/members/${memberId}`));
  }
}
