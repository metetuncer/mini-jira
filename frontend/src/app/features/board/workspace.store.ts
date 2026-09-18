import { Injectable, computed, effect, signal, untracked } from '@angular/core';
import { NgModel } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { ProjectService } from '../../core/services/project.service';
import { TaskService } from '../../core/services/task.service';
import { LabelService } from '../../core/services/label.service';
import { SprintService } from '../../core/services/sprint.service';
import { BoardRealtimeService } from '../../core/services/board-realtime.service';
import { AuthService } from '../../core/auth/auth.service';
import { Label, Project, ProjectMember, TaskItem, TaskStatus } from '../../core/models/models';
import { Sprint, SprintRequest, STATUS_NAMES, PRIORITY_NAMES, TYPE_NAMES } from '../../core/models/planning';
import { TaskDetailDialogComponent } from '../task-detail/task-detail-dialog.component';

@Injectable()
export class WorkspaceStore {
  projectId = '';
  project = signal<Project | null>(null);
  tasks = signal<TaskItem[]>([]);
  labels = signal<Label[]>([]);
  members = signal<ProjectMember[]>([]);
  sprints = signal<Sprint[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  notice = signal('');
  view = signal('board');
  search = signal('');
  assignee = signal('all');
  priority = signal(-1);
  status = signal(-1);
  type = signal(-1);
  label = signal('all');
  scope = signal('all');
  page = signal(0);
  pageSize = signal(10);
  sortKey = signal('createdAt');
  descending = signal(true);
  selected = signal<Set<string>>(new Set());
  bulkField = 'assigneeId';
  bulkValue: any = null;
  showTask = false;
  showSprint = false;
  editingSprint = '';
  draft = this.emptyTask();
  sprintDraft: SprintRequest = this.emptySprint();
  memberEmail = '';
  memberRole = 0;
  labelName = '';
  labelColor = '#6655d9';
  readonly statuses = STATUS_NAMES;
  readonly priorities = PRIORITY_NAMES;
  readonly types = TYPE_NAMES;
  readonly tabs = [
    { id: 'summary', name: 'Genel bakış', icon: '◈' },
    { id: 'board', name: 'Kanban', icon: '▥' },
    { id: 'backlog', name: 'Backlog & sprint', icon: '☷' },
    { id: 'grid', name: 'Görev tablosu', icon: '▦' },
    { id: 'team', name: 'Ekip & etiketler', icon: '♧' }
  ];
  isAdmin = computed(() => this.project()?.myRole === 1);
  activeSprint = computed(() => this.sprints().find((s) => s.status === 1));
  availableSprints = computed(() => this.sprints().filter((s) => s.status !== 2));
  filtered = computed(() =>
    this.tasks().filter((t) => {
      const term = this.search().trim().toLocaleLowerCase('tr');
      return (
        (!term ||
          `${t.title} ${t.description ?? ''} ${this.key(t)}`.toLocaleLowerCase('tr').includes(term)) &&
        (this.assignee() === 'all' ||
          (this.assignee() === 'none' ? !t.assigneeId : t.assigneeId === this.assignee())) &&
        (this.priority() === -1 || t.priority === this.priority()) &&
        (this.status() === -1 || t.status === this.status()) &&
        (this.type() === -1 || (t.issueType === 1 ? 1 : 0) === this.type()) &&
        (this.label() === 'all' || t.labelIds.includes(this.label())) &&
        (this.scope() === 'all' || (this.scope() === 'backlog' ? !t.sprintId : t.sprintId === this.scope()))
      );
    })
  );
  sorted = computed(() =>
    [...this.filtered()].sort((a, b) => {
      const key = this.sortKey() as keyof TaskItem;
      const value = (t: TaskItem) =>
        key === 'assigneeId'
          ? this.person(t.assigneeId)
          : key === 'sprintId'
            ? this.sprintName(t.sprintId)
            : (t[key] ?? '');
      const av = value(a),
        bv = value(b);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'tr', { numeric: true });
      return (this.descending() ? -cmp : cmp) || a.id.localeCompare(b.id);
    })
  );
  pageCount = computed(() => Math.max(1, Math.ceil(this.sorted().length / this.pageSize())));
  currentPage = computed(() => Math.min(this.page(), this.pageCount() - 1));
  rows = computed(() =>
    this.sorted().slice(this.currentPage() * this.pageSize(), (this.currentPage() + 1) * this.pageSize())
  );
  selectedIds = computed(() =>
    this.filtered()
      .filter((t) => this.selected().has(t.id))
      .map((t) => t.id)
  );
  done = computed(() => this.tasks().filter((t) => t.status === 2).length);
  progress = computed(() =>
    this.tasks().length ? Math.round((this.done() / this.tasks().length) * 100) : 0
  );
  overdueCount = computed(() => this.tasks().filter((t) => this.overdue(t)).length);
  private destroyed = false;
  private refreshVersion = 0;
  constructor(
    private route: ActivatedRoute,
    private projects: ProjectService,
    private api: TaskService,
    private labelApi: LabelService,
    private sprintApi: SprintService,
    public realtime: BoardRealtimeService,
    public auth: AuthService,
    private dialog: MatDialog
  ) {
    effect(
      () => {
        const c = this.realtime.taskCreated(),
          u = this.realtime.taskUpdated(),
          m = this.realtime.taskMoved();
        untracked(() => {
          for (const t of [c, u, m]) if (t?.projectId === this.projectId) this.upsert(t);
        });
      }
    );
    effect(
      () => {
        const id = this.realtime.taskDeleted();
        untracked(() => {
          if (id) this.tasks.update((ts) => ts.filter((t) => t.id !== id));
        });
      }
    );
    effect(() => {
      this.realtime.boardChanged();
      untracked(() => {
        if (this.projectId && !this.destroyed)
          void this.reload().catch(() => this.error.set('Güncel veriler alınamadı. Yenileyin.'));
      });
    });
  }
  async initialize() {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    await this.run(async () => {
      await this.reload();
      try {
        await this.realtime.connect(this.projectId);
      } catch {
        this.notice.set('Canlı bağlantı kurulamadı; Yenile ile verileri güncelleyebilirsiniz.');
      }
    });
    this.loading.set(false);
  }
  dispose() {
    this.destroyed = true;
    void this.realtime.disconnect();
  }
  async reload() {
    const version = ++this.refreshVersion;
    const [project, tasks, labels, members, sprints] = await Promise.all([
      this.projects.getById(this.projectId),
      this.api.getAll(this.projectId),
      this.labelApi.getAll(this.projectId),
      this.projects.getMembers(this.projectId),
      this.sprintApi.getAll(this.projectId)
    ]);
    if (this.destroyed || version !== this.refreshVersion) return;
    this.project.set(project);
    this.tasks.set(tasks);
    this.labels.set(labels);
    this.members.set(members);
    this.sprints.set(sprints);
  }
  async run(action: () => Promise<unknown>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await action();
    } catch (e: any) {
      this.error.set(
        (e?.error?.error ??
          Object.values(e?.error?.errors ?? {})
            .flat()
            .join(' ')) ||
          'İşlem tamamlanamadı. Bağlantıyı kontrol edip tekrar deneyin.'
      );
    } finally {
      this.busy.set(false);
    }
  }
  changeView(id: string) {
    this.view.set(id);
    this.scope.set('all');
    this.selected.set(new Set());
    this.page.set(0);
  }
  refresh() {
    return this.run(() => this.reload());
  }
  emptySelection() {
    return new Set<string>();
  }
  countStatus(status: number) {
    return this.tasks().filter((t) => t.status === status).length;
  }
  recentTasks() {
    return [...this.tasks()]
      .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
      .slice(0, 5);
  }
  clearFilters() {
    this.search.set('');
    this.assignee.set('all');
    this.priority.set(-1);
    this.status.set(-1);
    this.type.set(-1);
    this.label.set('all');
    this.scope.set('all');
    this.page.set(0);
  }
  key(t: TaskItem) {
    return 'MJ-' + t.id.slice(0, 8).toUpperCase();
  }
  person(id?: string | null) {
    return this.members().find((m) => m.userId === id)?.displayName ?? 'Atanmamış';
  }
  initials(id?: string | null) {
    return id
      ? this.person(id)
          .split(' ')
          .map((s) => s[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : '—';
  }
  sprintName(id?: string | null) {
    return this.sprints().find((s) => s.id === id)?.name ?? 'Backlog';
  }
  labelFor(id: string) {
    return this.labels().find((l) => l.id === id);
  }
  overdue(t: TaskItem) {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return !!t.dueDate && t.dueDate < today && t.status !== 2;
  }
  column(status: number) {
    return this.filtered()
      .filter(
        (t) => t.status === status && !this.sprints().some((s) => s.id === t.sprintId && s.status === 2)
      )
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  }
  sprintTasks(id: string | null) {
    return this.filtered().filter((t) => (t.sprintId ?? null) === id);
  }
  countFor(id: string) {
    return this.tasks().filter((t) => t.assigneeId === id && t.status !== 2).length;
  }
  sort(key: string) {
    if (this.sortKey() === key) this.descending.update((v) => !v);
    else {
      this.sortKey.set(key);
      this.descending.set(false);
    }
    this.page.set(0);
  }
  sortMark(key: string) {
    return this.sortKey() === key ? (this.descending() ? ' ↓' : ' ↑') : '';
  }
  toggle(id: string) {
    this.selected.update((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  allPageSelected() {
    return this.rows().length > 0 && this.rows().every((t) => this.selected().has(t.id));
  }
  togglePage() {
    const all = this.allPageSelected();
    this.selected.update((s) => {
      const n = new Set(s);
      this.rows().forEach((t) => (all ? n.delete(t.id) : n.add(t.id)));
      return n;
    });
  }
  upsert(t: TaskItem) {
    this.tasks.update((ts) =>
      ts.some((x) => x.id === t.id) ? ts.map((x) => (x.id === t.id ? t : x)) : [...ts, t]
    );
  }
  emptyTask() {
    return {
      title: '',
      description: '',
      priority: 1,
      issueType: 0,
      assigneeId: null as string | null,
      sprintId: null as string | null,
      dueDate: null as string | null
    };
  }
  emptySprint(): SprintRequest {
    const start = new Date(),
      end = new Date();
    end.setDate(end.getDate() + 14);
    return {
      name: '',
      goal: '',
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10)
    };
  }
  createTask() {
    return this.run(async () => {
      if (!this.draft.title.trim()) throw new Error();
      const { title, description, priority, ...planning } = this.draft;
      this.upsert(
        await this.api.create(this.projectId, title.trim(), description, priority, {
          ...planning,
          dueDate: planning.dueDate || null
        })
      );
      this.draft = this.emptyTask();
      this.showTask = false;
      this.notice.set('Görev oluşturuldu.');
    });
  }
  openTask(task: TaskItem) {
    this.dialog
      .open(TaskDetailDialogComponent, {
        width: '880px',
        maxWidth: '96vw',
        disableClose: true,
        data: {
          projectId: this.projectId,
          task,
          labels: this.labels(),
          members: this.members(),
          sprints: this.sprints()
        }
      })
      .afterClosed()
      .subscribe(() => {
        void this.run(() => this.reload());
      });
  }
  patchTask(t: TaskItem, patch: Partial<TaskItem>) {
    const x = { ...t, ...patch };
    return this.api.update(this.projectId, t.id, x.title, x.description, x.priority, x.assigneeId, x);
  }
  async updateField(t: TaskItem, field: string, value: any, control?: NgModel) {
    await this.run(async () => {
      this.upsert(
        field === 'status'
          ? await this.api.move(this.projectId, t.id, Number(value), 0)
          : await this.patchTask(t, { [field]: value })
      );
      await this.reload();
    });
    const current = this.tasks().find((x) => x.id === t.id);
    if (current)
      control?.control.setValue(current[field as keyof TaskItem] ?? null, {
        emitEvent: false,
        emitViewToModelChange: false
      });
  }
  async drop(event: CdkDragDrop<TaskItem[]>, status: number) {
    const task: TaskItem = event.item.data;
    if (
      this.search() ||
      this.assignee() !== 'all' ||
      this.priority() !== -1 ||
      this.type() !== -1 ||
      this.label() !== 'all' ||
      this.status() !== -1 ||
      this.scope() === 'all'
    ) {
      if (task.status === status) {
        this.notice.set('Sıralamak için tek bir sprint veya backlog seçin ve diğer filtreleri temizleyin.');
        return;
      }
    }
    await this.run(async () => {
      await this.api.move(this.projectId, task.id, status, event.currentIndex);
      await this.reload();
    });
  }
  bulkApply() {
    return this.run(async () => {
      const ids = this.selectedIds();
      let done = 0;
      try {
        for (const id of ids) {
          const t = this.tasks().find((t) => t.id === id)!;
          const updated =
            this.bulkField === 'status'
              ? await this.api.move(this.projectId, id, Number(this.bulkValue), 0)
              : await this.patchTask(t, { [this.bulkField]: this.bulkValue });
          this.upsert(updated);
          this.selected.update((s) => {
            const n = new Set(s);
            n.delete(id);
            return n;
          });
          done++;
        }
        this.notice.set(`${done} görev güncellendi.`);
      } catch (e) {
        this.notice.set(`${done}/${ids.length} görev güncellendi. Kalan seçim korunuyor.`);
        throw e;
      } finally {
        await this.reload();
      }
    });
  }
  editSprint(s?: Sprint) {
    this.editingSprint = s?.id ?? '';
    this.sprintDraft = s
      ? { name: s.name, goal: s.goal, startDate: s.startDate, endDate: s.endDate }
      : this.emptySprint();
    this.showSprint = true;
  }
  saveSprint() {
    return this.run(async () => {
      if (this.editingSprint)
        await this.sprintApi.update(this.projectId, this.editingSprint, this.sprintDraft);
      else await this.sprintApi.create(this.projectId, this.sprintDraft);
      this.showSprint = false;
      await this.reload();
    });
  }
  sprintAction(s: Sprint, action: 'start' | 'complete' | 'delete') {
    if (
      action === 'complete' &&
      !confirm('Sprint tamamlansın mı? Bitmeyen görevler mevcut durumlarıyla backlog’a taşınacak.')
    )
      return;
    if (action === 'delete' && !confirm('Sprint silinsin mi? Görevler backlog’a taşınacak.')) return;
    return this.run(async () => {
      if (action === 'delete') await this.sprintApi.delete(this.projectId, s.id);
      else await this.sprintApi.action(this.projectId, s.id, action);
      await this.reload();
    });
  }
  addMember() {
    return this.run(async () => {
      await this.projects.addMember(this.projectId, this.memberEmail.trim(), Number(this.memberRole));
      this.memberEmail = '';
      await this.reload();
    });
  }
  removeMember(m: ProjectMember) {
    if (!confirm(`${m.displayName} projeden çıkarılsın mı? Görev atamaları kaldırılacak.`)) return;
    return this.run(async () => {
      await this.projects.removeMember(this.projectId, m.id);
      await this.reload();
    });
  }
  changeRole(m: ProjectMember, role: number) {
    return this.run(async () => {
      await this.projects.updateMemberRole(this.projectId, m.id, Number(role));
      await this.reload();
    });
  }
  addLabel() {
    return this.run(async () => {
      await this.labelApi.create(this.projectId, this.labelName.trim(), this.labelColor);
      this.labelName = '';
      await this.reload();
    });
  }
  removeLabel(l: Label) {
    if (!confirm(`“${l.name}” etiketi tüm görevlerden kaldırılsın mı?`)) return;
    return this.run(async () => {
      await this.labelApi.delete(this.projectId, l.id);
      await this.reload();
    });
  }
  exportCsv() {
    const safe = (v: unknown) =>
      '"' +
      String(v ?? '')
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const data = [
      ['Kimlik', 'Başlık', 'Tür', 'Durum', 'Öncelik', 'Atanan', 'Sprint', 'Bitiş'],
      ...this.sorted().map((t) => [
        this.key(t),
        t.title,
        this.types[t.issueType === 1 ? 1 : 0],
        this.statuses[t.status],
        this.priorities[t.priority],
        this.person(t.assigneeId),
        this.sprintName(t.sprintId),
        t.dueDate
      ])
    ];
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + data.map((row) => row.map(safe).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8'
      })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minijira-gorevler.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
