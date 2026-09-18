import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectRole } from '../../../core/models/models';

@Component({
    selector: 'app-project-list',
    imports: [
        FormsModule,
        RouterLink,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatDialogModule
    ],
    template: `
    <div class="header">
      <div>
        <p class="eyebrow">ÇALIŞMA ALANI</p>
        <h1>Projelerim</h1>
        <p class="subtitle">Fikirlerden tamamlanan işlere, her şey bir arada.</p>
      </div>
      <button mat-flat-button color="primary" (click)="showCreateForm.set(!showCreateForm())">
        <mat-icon>add</mat-icon> Yeni proje
      </button>
    </div>

    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (showCreateForm()) {
      <mat-card class="create-card">
        <form (ngSubmit)="createProject()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Proje adı</mat-label>
            <input matInput name="name" [(ngModel)]="newProjectName" required />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Açıklama (opsiyonel)</mat-label>
            <input matInput name="description" [(ngModel)]="newProjectDescription" />
          </mat-form-field>
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="creating() || newProjectName.trim().length < 2"
          >
            Oluştur
          </button>
        </form>
      </mat-card>
    }

    @if (loading()) {
      <p>Yükleniyor...</p>
    } @else if (projects().length === 0) {
      <p>Henüz bir projen yok. "Yeni proje" ile başla.</p>
    } @else {
      <div class="grid">
        @for (project of projects(); track project.id) {
          <a class="project-card" [routerLink]="['/projects', project.id]"
            ><span class="project-symbol">{{ project.name.slice(0, 1) }}</span>
            <h3>{{ project.name }}</h3>
            <p>{{ project.description || 'Açıklama yok' }}</p>
            <span class="role">{{ project.myRole === roleAdmin ? 'Yönetici' : 'Üye' }}</span>
          </a>
        }
      </div>
    }
  `,
    styles: [
        `
      :host {
        display: block;
        max-width: 1180px;
        margin: 0 auto;
        padding: 38px 28px;
      }
      .eyebrow {
        font-size: 10px;
        color: #8f80bf;
        letter-spacing: 2px;
      }
      .subtitle {
        font-size: 13px;
        color: #8a95aa;
      }
      h1 {
        font-size: 30px;
        letter-spacing: -0.7px;
        margin: 8px 0;
      }
      .project-symbol {
        display: grid;
        place-items: center;
        width: 40px;
        height: 40px;
        border-radius: 9px;
        background: #eee9fc;
        color: #7a64bf;
        font-size: 22px;
        margin-bottom: 24px;
      }
      .project-card {
        display: block;
        text-decoration: none;
        color: #36415a;
        border: 1px solid #e2e6ef;
        background: white;
        border-radius: 10px;
      }
      .project-card h3 {
        font-size: 17px;
      }
      .project-card p {
        font-size: 12px;
        color: #8a94a7;
        min-height: 34px;
      }
      .error {
        color: #b54e50;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .create-card {
        padding: 16px;
        margin-bottom: 24px;
        max-width: 480px;
      }
      .full-width {
        width: 100%;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
      }
      .project-card {
        padding: 24px;
        cursor: pointer;
        transition: box-shadow 0.15s;
      }
      .project-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      }
      .role {
        display: inline-block;
        margin-top: 8px;
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 12px;
        background: #eef2ff;
        color: #4338ca;
      }
    `
    ]
})
export class ProjectListComponent implements OnInit {
  projects = signal<Project[]>([]);
  loading = signal(true);
  error = signal('');
  creating = signal(false);
  showCreateForm = signal(false);
  newProjectName = '';
  newProjectDescription = '';
  roleAdmin = ProjectRole.Admin;

  constructor(private projectService: ProjectService) {}

  async ngOnInit(): Promise<void> {
    await this.loadProjects();
  }

  async loadProjects(): Promise<void> {
    this.loading.set(true);
    try {
      this.projects.set(await this.projectService.getMyProjects());
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Projeler yüklenemedi. Sayfayı yenileyin.');
    } finally {
      this.loading.set(false);
    }
  }

  async createProject(): Promise<void> {
    if (!this.newProjectName.trim() || this.creating()) return;
    this.creating.set(true);
    this.error.set('');
    try {
      await this.projectService.create(this.newProjectName, this.newProjectDescription || undefined);
      this.newProjectName = '';
      this.newProjectDescription = '';
      this.showCreateForm.set(false);
      await this.loadProjects();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Proje oluşturulamadı. En az 2 karakterlik bir ad girin.');
    } finally {
      this.creating.set(false);
    }
  }
}
