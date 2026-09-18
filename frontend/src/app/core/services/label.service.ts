import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Label } from '../models/models';

@Injectable({ providedIn: 'root' })
export class LabelService {
  constructor(private http: HttpClient) {}

  private baseUrl(projectId: string): string {
    return `${environment.apiUrl}/projects/${projectId}/labels`;
  }

  getAll(projectId: string): Promise<Label[]> {
    return firstValueFrom(this.http.get<Label[]>(this.baseUrl(projectId)));
  }

  create(projectId: string, name: string, colorHex: string): Promise<Label> {
    return firstValueFrom(this.http.post<Label>(this.baseUrl(projectId), { name, colorHex }));
  }

  delete(projectId: string, labelId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl(projectId)}/${labelId}`));
  }
}
