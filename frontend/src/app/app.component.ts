import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './core/auth/auth.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule],
    template: `
    <mat-toolbar color="primary" class="toolbar">
      <a routerLink="/projects" class="brand">
        <span style="background:#6655d9;color:white;border-radius:7px;padding:0 8px;font-size:21px">▥</span>
        <span
          >Mini Jira<span style="font-size:10px;letter-spacing:1px;margin-left:12px;color:#9b92bf"
            >WORKSPACE</span
          ></span
        >
      </a>
      <span class="spacer"></span>
      @if (auth.isAuthenticated()) {
        <span class="user">{{ auth.currentUser()?.displayName }}</span>
        <button mat-icon-button (click)="auth.logout()" aria-label="Çıkış yap">
          <mat-icon>logout</mat-icon>
        </button>
      }
    </mat-toolbar>

    <main class="content">
      <router-outlet />
    </main>
  `,
    styles: [
        `
      .toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        background: white;
        color: #36425b;
        border-bottom: 1px solid #e3e7ef;
        height: 65px;
        padding: 0 28px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        color: inherit;
        text-decoration: none;
        font-weight: 600;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .user {
        margin-right: 8px;
        font-size: 14px;
      }
      .content {
        margin: 0 auto;
      }
      @media (max-width: 600px) {
        .toolbar {
          padding: 0 16px;
        }
        .brand {
          font-size: 18px;
        }
        .brand span span,
        .user {
          display: none;
        }
      }
    `
    ]
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
