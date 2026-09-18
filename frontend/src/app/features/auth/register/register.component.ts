import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
    selector: 'app-register',
    imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    template: `
    <mat-card class="auth-card">
      <h1>Kayıt ol</h1>

      <form (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ad Soyad</mat-label>
          <input matInput name="displayName" [(ngModel)]="displayName" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>E-posta</mat-label>
          <input matInput type="email" name="email" [(ngModel)]="email" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Şifre (en az 6 karakter)</mat-label>
          <input matInput type="password" name="password" [(ngModel)]="password" required minlength="6" />
        </mat-form-field>

        @if (errorMessage()) {
          <p class="error">{{ errorMessage() }}</p>
        }

        <button mat-flat-button color="primary" type="submit" [disabled]="loading()" class="full-width">
          {{ loading() ? 'Kaydediliyor...' : 'Kayıt ol' }}
        </button>
      </form>

      <p class="switch">Zaten hesabın var mı? <a routerLink="/login">Giriş yap</a></p>
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
export class RegisterComponent {
  displayName = '';
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
      await this.authService.register(this.email, this.displayName, this.password);
      await this.router.navigateByUrl('/projects');
    } catch (err: any) {
      this.errorMessage.set(err?.error?.error ?? 'Kayıt başarısız.');
    } finally {
      this.loading.set(false);
    }
  }
}
