import { Component, Inject, OnInit, WritableSignal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { TaskService } from '../../core/services/task.service';
import { CommentService } from '../../core/services/comment.service';
import { AttachmentService } from '../../core/services/attachment.service';
import { Attachment, Comment, Label, TaskItem, TaskPriority, ProjectMember } from '../../core/models/models';

import { Sprint, STATUS_NAMES, TYPE_NAMES } from '../../core/models/planning';
import { AuthService } from '../../core/auth/auth.service';

export interface TaskDetailDialogData {
  projectId: string;
  task: TaskItem;
  labels: Label[];
  members: ProjectMember[];
  sprints: Sprint[];
}

@Component({
    selector: 'app-task-detail-dialog',
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatListModule
    ],
    templateUrl: './task-detail-dialog.component.html',
    styleUrl: './task-detail-dialog.component.scss'
})
export class TaskDetailDialogComponent implements OnInit {
  readonly Priority = TaskPriority;
  readonly statuses = STATUS_NAMES;
  readonly types = TYPE_NAMES;
  error = signal('');
  message = signal('');
  saved: TaskItem;
  busy = signal(false);
  async perform(action: () => Promise<unknown>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'İşlem tamamlanamadı. Tekrar deneyin.');
    } finally {
      this.busy.set(false);
    }
  }
  field(key: string, value: any) {
    this.task.update((t) => ({ ...t, [key]: value }));
  }
  dirty() {
    return JSON.stringify(this.task()) !== JSON.stringify(this.saved);
  }
  archived() {
    return this.data.sprints.some((s) => s.id === this.task().sprintId && s.status === 2);
  }
  async changeStatus(status: number) {
    await this.perform(async () => {
      const updated = await this.taskService.move(this.data.projectId, this.task().id, status, 0);
      this.saved = { ...this.saved, status: updated.status, order: updated.order };
      this.task.update((t) => ({ ...t, status: updated.status, order: updated.order }));
    });
  }

  task: WritableSignal<TaskItem>;
  comments = signal<Comment[]>([]);
  attachments = signal<Attachment[]>([]);
  newComment = '';
  saving = signal(false);
  uploading = signal(false);

  constructor(
    private dialogRef: MatDialogRef<TaskDetailDialogComponent, TaskItem | 'deleted' | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: TaskDetailDialogData,
    private taskService: TaskService,
    private commentService: CommentService,
    public auth: AuthService,
    private attachmentService: AttachmentService
  ) {
    this.saved = structuredClone(this.data.task);
    this.task = signal<TaskItem>(structuredClone(this.data.task));
  }

  onTitleChange(value: string): void {
    this.task.set({ ...this.task(), title: value });
  }

  onDescriptionChange(value: string): void {
    this.task.set({ ...this.task(), description: value });
  }

  onPriorityChange(value: TaskPriority): void {
    this.task.set({ ...this.task(), priority: value });
  }

  async ngOnInit(): Promise<void> {
    await this.perform(async () => {
      const [comments, attachments] = await Promise.all([
        this.commentService.getAll(this.data.projectId, this.task().id),
        this.attachmentService.getAll(this.data.projectId, this.task().id)
      ]);
      this.comments.set(comments);
      this.attachments.set(attachments);
    });
  }

  isLabelActive(labelId: string): boolean {
    return this.task().labelIds.includes(labelId);
  }

  async toggleLabel(labelId: string): Promise<void> {
    await this.perform(async () => {
      const current = this.task().labelIds;
      const next = current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId];
      await this.taskService.setLabels(this.data.projectId, this.task().id, next);
      this.saved = { ...this.saved, labelIds: next };
      this.task.update((t) => ({ ...t, labelIds: next }));
    });
  }
  async save(): Promise<void> {
    const t = this.task();
    if (!t.title.trim()) {
      this.error.set('Başlık zorunlu.');
      return;
    }
    await this.perform(async () => {
      this.saving.set(true);
      try {
        const updated = await this.taskService.update(
          this.data.projectId,
          t.id,
          t.title.trim(),
          t.description,
          t.priority,
          t.assigneeId,
          t
        );
        this.saved = structuredClone(updated);
        this.task.set(structuredClone(updated));
        this.message.set('Değişiklikler kaydedildi.');
      } finally {
        this.saving.set(false);
      }
    });
  }

  private async addCommentImpl(): Promise<void> {
    const content = this.newComment.trim();
    if (!content) return;

    const comment = await this.commentService.add(this.data.projectId, this.task().id, content);
    this.comments.set([...this.comments(), comment]);
    this.newComment = '';
  }

  private async deleteCommentImpl(commentId: string): Promise<void> {
    await this.commentService.delete(this.data.projectId, this.task().id, commentId);
    this.comments.set(this.comments().filter((c) => c.id !== commentId));
  }

  private async onFileSelectedImpl(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    try {
      const attachment = await this.attachmentService.upload(this.data.projectId, this.task().id, file);
      this.attachments.set([attachment, ...this.attachments()]);
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  private async deleteAttachmentImpl(attachmentId: string): Promise<void> {
    await this.attachmentService.delete(this.data.projectId, this.task().id, attachmentId);
    this.attachments.set(this.attachments().filter((a) => a.id !== attachmentId));
  }

  private async deleteTaskImpl(): Promise<void> {
    if (!confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
    await this.taskService.delete(this.data.projectId, this.task().id);
    this.dialogRef.close('deleted');
  }

  close(): void {
    if (this.busy()) return;
    if (this.dirty() && !confirm('Kaydedilmemiş alan değişiklikleri var. Vazgeçip kapatılsın mı?')) return;
    this.dialogRef.close(this.saved);
  }

  async download(attachment: Attachment) {
    await this.perform(() =>
      this.attachmentService.download(this.data.projectId, this.task().id, attachment)
    );
  }

  addComment() {
    return this.perform(() => this.addCommentImpl());
  }
  deleteComment(id: string) {
    return this.perform(() => this.deleteCommentImpl(id));
  }
  onFileSelected(e: Event) {
    return this.perform(() => this.onFileSelectedImpl(e));
  }
  deleteAttachment(id: string) {
    return this.perform(() => this.deleteAttachmentImpl(id));
  }
  deleteTask() {
    return this.perform(() => this.deleteTaskImpl());
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
