import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { AuthService } from '../core/auth.service';
import { ROLE_LABEL } from '../core/models';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, NzLayoutModule, NzMenuModule, NzIconModule, NzAvatarModule, NzDropdownModule],
  template: `
    <nz-layout class="app-layout">
      <nz-sider nzCollapsible nzBreakpoint="lg" [nzCollapsedWidth]="0" [(nzCollapsed)]="collapsed" [nzTrigger]="null" nzWidth="230px">
        <div class="logo"><span nz-icon nzType="database"></span>@if (!collapsed()) {<b>Inventory AI</b>}</div>
        <ul nz-menu nzTheme="dark" nzMode="inline" (click)="closeOnMobile()">
          @for (item of menu; track item.link) {
            @if (!item.admin || auth.hasRole()) {
              <li nz-menu-item nzMatchRouter>
                <a [routerLink]="item.link"><span nz-icon [nzType]="item.icon"></span><span>{{ item.label }}</span></a>
              </li>
            }
          }
        </ul>
      </nz-sider>
      <nz-layout>
        <nz-header class="header">
          <span class="trigger" nz-icon [nzType]="collapsed() ? 'menu-unfold' : 'menu-fold'" (click)="collapsed.set(!collapsed())"></span>
          <div class="user" nz-dropdown [nzDropdownMenu]="userMenu" nzPlacement="bottomRight">
            <nz-avatar nzIcon="user" nzSize="small"></nz-avatar>
            <span class="name">{{ auth.user()?.fullName }}</span>
          </div>
          <nz-dropdown-menu #userMenu="nzDropdownMenu">
            <ul nz-menu>
              <li nz-menu-item nzDisabled>{{ roleLabel[auth.user()!.role] }} · {{ auth.user()?.email }}</li>
              <li nz-menu-item (click)="auth.logout()"><span nz-icon nzType="logout"></span> Đăng xuất</li>
            </ul>
          </nz-dropdown-menu>
        </nz-header>
        <nz-content class="content"><router-outlet /></nz-content>
      </nz-layout>
    </nz-layout>
  `,
  styles: `
    .app-layout { min-height: 100vh; }
    .logo { height: 64px; display: flex; align-items: center; gap: 10px; padding: 0 24px; color: #fff; font-size: 18px; white-space: nowrap; overflow: hidden; }
    .header { background: #fff; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 4px rgba(0,21,41,.08); position: sticky; top: 0; z-index: 10; }
    .trigger { font-size: 18px; cursor: pointer; }
    .user { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .content { padding: 20px; }
    @media (max-width: 576px) { .content { padding: 12px; } .name { display: none; } }
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly collapsed = signal(window.innerWidth < 992);
  protected readonly roleLabel = ROLE_LABEL;
  protected readonly menu = [
    { link: '/dashboard', label: 'Tổng quan', icon: 'dashboard' },
    { link: '/assistant', label: 'Trợ lý AI', icon: 'robot' },
    { link: '/products', label: 'Sản phẩm', icon: 'shopping' },
    { link: '/stock', label: 'Tồn kho', icon: 'inbox' },
    { link: '/documents/new', label: 'Lập phiếu nhập / xuất', icon: 'swap' },
    { link: '/movements', label: 'Lịch sử nhập xuất', icon: 'history' },
    { link: '/warehouses', label: 'Kho hàng', icon: 'home' },
    { link: '/users', label: 'Người dùng', icon: 'team', admin: true },
  ];

  closeOnMobile() {
    if (window.innerWidth < 992) this.collapsed.set(true);
  }
}
