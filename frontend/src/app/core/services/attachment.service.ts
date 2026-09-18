import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Attachment } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  constructor(private http: HttpClient) {}

  private baseUrl(projectId: string, taskId: string): string {
    return `${environment.apiUrl}/projects/${projectId}/tasks/${taskId}/attachments`;
  }

  getAll(projectId: string, taskId: string): Promise<Attachment[]> {
    return firstValueFrom(this.http.get<Attachment[]>(this.baseUrl(projectId, taskId)));
  }

  upload(projectId: string, taskId: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(this.http.post<Attachment>(this.baseUrl(projectId, taskId), formData));
  }

  async download(projectId: string, taskId: string, attachment: Attachment): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`${this.baseUrl(projectId, taskId)}/${attachment.id}/download`, { responseType: 'blob' })
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  delete(projectId: string, taskId: string, attachmentId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl(projectId, taskId)}/${attachmentId}`));
  }
}
