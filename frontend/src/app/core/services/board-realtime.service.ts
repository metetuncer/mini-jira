import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { TaskItem } from '../models/models';
import { AuthService } from '../auth/auth.service';

// Board ekranındaki gerçek zamanlı güncellemeleri (SignalR) yöneten servis.
// Bir projeye bağlanınca, o projedeki diğer kullanıcıların yaptığı task
// değişiklikleri anlık olarak bu servisin sinyalleri üzerinden yayılır.
@Injectable({ providedIn: 'root' })
export class BoardRealtimeService {
  private connection: signalR.HubConnection | null = null;

  readonly boardChanged = signal(0);
  readonly connected = signal(false);
  readonly taskCreated = signal<TaskItem | null>(null);
  readonly taskUpdated = signal<TaskItem | null>(null);
  readonly taskMoved = signal<TaskItem | null>(null);
  readonly taskDeleted = signal<string | null>(null);

  constructor(private authService: AuthService) {}

  async connect(projectId: string): Promise<void> {
    await this.disconnect();

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}?projectId=${projectId}`, {
        accessTokenFactory: () => this.authService.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('boardChanged', () => this.boardChanged.update((v) => v + 1));
    this.connection.onreconnecting(() => this.connected.set(false));
    this.connection.onclose(() => this.connected.set(false));
    this.connection.onreconnected(() => {
      this.connected.set(true);
      this.boardChanged.update((v) => v + 1);
    });
    this.connection.on('taskCreated', (task: TaskItem) => this.taskCreated.set(task));
    this.connection.on('taskUpdated', (task: TaskItem) => this.taskUpdated.set(task));
    this.connection.on('taskMoved', (task: TaskItem) => this.taskMoved.set(task));
    this.connection.on('taskDeleted', (taskId: string) => this.taskDeleted.set(taskId));

    await this.connection.start();
    this.connected.set(true);
    this.boardChanged.update((v) => v + 1);
  }

  async disconnect(): Promise<void> {
    this.connected.set(false);
    this.taskCreated.set(null);
    this.taskUpdated.set(null);
    this.taskMoved.set(null);
    this.taskDeleted.set(null);
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }
}
