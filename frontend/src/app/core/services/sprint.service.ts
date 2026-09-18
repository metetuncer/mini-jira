import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sprint, SprintRequest } from '../models/planning';
@Injectable({ providedIn: 'root' })
export class SprintService {
  constructor(private http: HttpClient) {}
  private url(p: string) {
    return `${environment.apiUrl}/projects/${p}/sprints`;
  }
  getAll(p: string) {
    return firstValueFrom(this.http.get<Sprint[]>(this.url(p)));
  }
  create(p: string, body: SprintRequest) {
    return firstValueFrom(this.http.post<Sprint>(this.url(p), body));
  }
  update(p: string, id: string, body: SprintRequest) {
    return firstValueFrom(this.http.put<Sprint>(`${this.url(p)}/${id}`, body));
  }
  action(p: string, id: string, action: 'start' | 'complete') {
    return firstValueFrom(this.http.post<void>(`${this.url(p)}/${id}/${action}`, {}));
  }
  delete(p: string, id: string) {
    return firstValueFrom(this.http.delete<void>(`${this.url(p)}/${id}`));
  }
}
