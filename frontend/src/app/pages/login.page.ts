import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, NzCardModule, NzFormModule, NzInputModule, NzButtonModule, NzIconModule, NzAlertModule],
  template: `
    <div class="wrap">
      <nz-card class="box">
        <h1><span nz-icon nzType="database"></span> Inventory AI</h1>
        <p class="muted">Quản lý kho hàng thông minh</p>
        @if (error()) {
          <nz-alert nzType="error" [nzMessage]="error()!" nzShowIcon class="mb"></nz-alert>
        }
        <form nz-form nzLayout="vertical" (ngSubmit)="submit()">
          <nz-form-item>
            <nz-form-label>Email</nz-form-label>
            <nz-input-wrapper><span nzInputPrefix nz-icon nzType="user"></span>
              <input nz-input name="email" type="email" [(ngModel)]="email" required autocomplete="username" />
            </nz-input-wrapper>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>Mật khẩu</nz-form-label>
            <nz-input-wrapper><span nzInputPrefix nz-icon nzType="lock"></span>
              <input nz-input name="password" type="password" [(ngModel)]="password" required autocomplete="current-password" />
            </nz-input-wrapper>
          </nz-form-item>
          <button nz-button nzType="primary" nzBlock [nzLoading]="loading()">Đăng nhập</button>
        </form>
        <div class="demo">
          <b>Tài khoản demo:</b>
          @for (a of demo; track a.email) {
            <a (click)="email = a.email; password = a.password">{{ a.label }}</a>
          }
        </div>
      </nz-card>
    </div>
  `,
  styles: `
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 16px; background: linear-gradient(135deg, #001529, #1d39c4); }
    .box { width: 100%; max-width: 380px; }
    h1 { margin: 0; font-size: 24px; }
    .mb { margin-bottom: 12px; }
    .demo { margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; font-size: 13px; }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected email = 'admin@demo.vn';
  protected password = 'Admin@123';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly demo = [
    { label: 'Admin', email: 'admin@demo.vn', password: 'Admin@123' },
    { label: 'Quản lý', email: 'manager@demo.vn', password: 'Manager@123' },
    { label: 'Nhân viên', email: 'staff@demo.vn', password: 'Staff@123' },
  ];

  submit() {
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.email, this.password).subscribe({
      next: () => void this.router.navigate(['/']),
      error: (e) => {
        this.error.set(e.status === 401 ? 'Sai email hoặc mật khẩu' : 'Không kết nối được máy chủ');
        this.loading.set(false);
      },
    });
  }
}
