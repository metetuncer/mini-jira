import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
    selector: 'app-login',
    imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    template: `
    <mat-card class="auth-card">
      <h1>Giriş yap</h1>

      <form (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>E-posta</mat-label>
          <input matInput type="email" name="email" [(ngModel)]="email" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Şifre</mat-label>
          <input matInput type="password" name="password" [(ngModel)]="password" required />
        </mat-form-field>

        @if (errorMessage()) {
          <p class="error">{{ errorMessage() }}</p>
        }

        <button mat-flat-button color="primary" type="submit" [disabled]="loading()" class="full-width">
          {{ loading() ? 'Giriş yapılıyor...' : 'Giriş yap' }}
        </button>
      </form>

      <p class="switch">Hesabın yok mu? <a routerLink="/register">Kayıt ol</a></p>
    </mat-card>
  `,
    styles: [
        `
      .auth-card {
        max-width: 400px;
        margin: 48px auto;
        padding: 24px;
      }
      .full-width {
        width: 100%;
        margin-bottom: 8px;
      }
      .error {
        color: #b3261e;
        font-size: 14px;
      }
      .switch {
        text-align: center;
        font-size: 14px;
      }
    `
    ]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async submit(): Promise<void> {
    this.errorMessage.set('');
    this.loading.set(true);
    try {
      await this.authService.login(this.email, this.password);
      await this.router.navigateByUrl('/projects');
    } catch (err: any) {
      this.errorMessage.set(err?.error?.error ?? 'Giriş başarısız. Bilgilerinizi kontrol edin.');
    } finally {
      this.loading.set(false);
    }
  }
}
