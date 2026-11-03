import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Warehouse } from '../core/models';

@Component({
  selector: 'app-warehouses',
  imports: [FormsModule, NzCardModule, NzTableModule, NzButtonModule, NzIconModule, NzModalModule, NzFormModule, NzInputModule, NzTagModule],
  template: `
    <div class="page-title">
      <h2>Kho hàng</h2>
      @if (canEdit) { <button nz-button nzType="primary" (click)="open()"><span nz-icon nzType="plus"></span>Thêm kho</button> }
    </div>
    <nz-card>
      <nz-table #t [nzData]="items()" [nzShowPagination]="false" [nzScroll]="{ x: '600px' }">
        <thead><tr><th>Mã</th><th>Tên kho</th><th>Địa chỉ</th><th class="num">Mặt hàng</th><th class="num">Tổng SL</th>@if (canEdit) {<th></th>}</tr></thead>
        <tbody>
          @for (w of t.data; track w.id) {
            <tr>
              <td><nz-tag nzColor="blue">{{ w.code }}</nz-tag></td>
              <td>{{ w.name }}</td>
              <td>{{ w.address }}</td>
              <td class="num">{{ w.productCount }}</td>
              <td class="num">{{ w.totalUnits }}</td>
              @if (canEdit) { <td><a (click)="open(w)"><span nz-icon nzType="edit"></span></a></td> }
            </tr>
          }
        </tbody>
      </nz-table>
    </nz-card>
    <nz-modal [nzVisible]="visible()" [nzTitle]="form.id ? 'Sửa kho' : 'Thêm kho'" (nzOnCancel)="visible.set(false)" (nzOnOk)="save()" nzOkText="Lưu">
      <ng-container *nzModalContent>
        <form nz-form nzLayout="vertical">
          <nz-form-item><nz-form-label nzRequired>Mã kho</nz-form-label><input nz-input name="code" [(ngModel)]="form.code" placeholder="VD: HCM-02" /></nz-form-item>
          <nz-form-item><nz-form-label nzRequired>Tên kho</nz-form-label><input nz-input name="name" [(ngModel)]="form.name" /></nz-form-item>
          <nz-form-item><nz-form-label>Địa chỉ</nz-form-label><input nz-input name="address" [(ngModel)]="form.address" /></nz-form-item>
        </form>
      </ng-container>
    </nz-modal>
  `,
})
export class WarehousesPage {
  private readonly api = inject(ApiService);
  private readonly msg = inject(NzMessageService);
  protected readonly canEdit = inject(AuthService).hasRole('MANAGER');
  protected readonly items = signal<Warehouse[]>([]);
  protected readonly visible = signal(false);
  protected form: Partial<Warehouse> = {};

  constructor() {
    this.load();
  }

  load() {
    this.api.warehouses().subscribe((w) => this.items.set(w));
  }

  open(w?: Warehouse) {
    this.form = w ? { id: w.id, code: w.code, name: w.name, address: w.address } : {};
    this.visible.set(true);
  }

  save() {
    const { id, ...body } = this.form;
    this.api.saveWarehouse(body, id).subscribe(() => {
      this.msg.success('Đã lưu kho');
      this.visible.set(false);
      this.load();
    });
  }
}
