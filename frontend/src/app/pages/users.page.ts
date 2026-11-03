import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ApiService } from '../core/api.service';
import { Role, ROLE_LABEL, User } from '../core/models';

@Component({
  selector: 'app-users',
  imports: [FormsModule, NzCardModule, NzTableModule, NzButtonModule, NzIconModule, NzModalModule, NzFormModule, NzInputModule, NzSelectModule, NzTagModule, NzSwitchModule],
  template: `
    <div class="page-title">
      <h2>Người dùng</h2>
      <button nz-button nzType="primary" (click)="open()"><span nz-icon nzType="plus"></span>Thêm người dùng</button>
    </div>
    <nz-card>
      <nz-table #t [nzData]="items()" [nzShowPagination]="false" [nzScroll]="{ x: '600px' }">
        <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Hoạt động</th><th></th></tr></thead>
        <tbody>
          @for (u of t.data; track u.id) {
            <tr>
              <td>{{ u.fullName }}</td>
              <td>{{ u.email }}</td>
              <td><nz-tag [nzColor]="u.role === 'ADMIN' ? 'gold' : u.role === 'MANAGER' ? 'blue' : 'default'">{{ roleLabel[u.role] }}</nz-tag></td>
              <td><nz-switch [ngModel]="u.isActive" (ngModelChange)="toggle(u, $event)" nzSize="small"></nz-switch></td>
              <td><a (click)="open(u)"><span nz-icon nzType="edit"></span></a></td>
            </tr>
          }
        </tbody>
      </nz-table>
    </nz-card>
    <nz-modal [nzVisible]="visible()" [nzTitle]="form.id ? 'Sửa người dùng' : 'Thêm người dùng'" (nzOnCancel)="visible.set(false)" (nzOnOk)="save()" nzOkText="Lưu">
      <ng-container *nzModalContent>
        <form nz-form nzLayout="vertical">
          <nz-form-item><nz-form-label nzRequired>Họ tên</nz-form-label><input nz-input name="fullName" [(ngModel)]="form.fullName" /></nz-form-item>
          <nz-form-item><nz-form-label nzRequired>Email</nz-form-label><input nz-input name="email" type="email" [(ngModel)]="form.email" /></nz-form-item>
          <nz-form-item><nz-form-label [nzRequired]="!form.id">Mật khẩu {{ form.id ? '(bỏ trống nếu không đổi)' : '' }}</nz-form-label><input nz-input name="password" type="password" [(ngModel)]="form.password" /></nz-form-item>
          <nz-form-item><nz-form-label>Vai trò</nz-form-label>
            <nz-select name="role" [(ngModel)]="form.role">
              @for (r of roles; track r) { <nz-option [nzValue]="r" [nzLabel]="roleLabel[r]"></nz-option> }
            </nz-select>
          </nz-form-item>
        </form>
      </ng-container>
    </nz-modal>
  `,
})
export class UsersPage {
  private readonly api = inject(ApiService);
  private readonly msg = inject(NzMessageService);
  protected readonly items = signal<User[]>([]);
  protected readonly visible = signal(false);
  protected readonly roles: Role[] = ['STAFF', 'MANAGER', 'ADMIN'];
  protected readonly roleLabel = ROLE_LABEL;
  protected form: Partial<User> & { password?: string } = {};

  constructor() {
    this.load();
  }

  load() {
    this.api.users({ limit: 100 }).subscribe((r) => this.items.set(r.items));
  }

  open(u?: User) {
    this.form = u ? { id: u.id, fullName: u.fullName, email: u.email, role: u.role } : { role: 'STAFF' };
    this.visible.set(true);
  }

  toggle(u: User, isActive: boolean) {
    this.api.saveUser({ isActive }, u.id).subscribe({ next: () => this.load(), error: () => this.load() });
  }

  save() {
    const { id, password, ...body } = this.form;
    this.api.saveUser(password ? { ...body, password } : body, id).subscribe(() => {
      this.msg.success('Đã lưu');
      this.visible.set(false);
      this.load();
    });
  }
}
