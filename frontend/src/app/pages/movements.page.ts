import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ApiService } from '../core/api.service';
import { Movement, MOVEMENT_COLOR, MOVEMENT_LABEL, MovementType, Warehouse } from '../core/models';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

@Component({
  selector: 'app-movements',
  imports: [FormsModule, DatePipe, NzCardModule, NzTableModule, NzSelectModule, NzInputModule, NzTagModule, NzDatePickerModule, NzIconModule],
  template: `
    <div class="page-title"><h2>Lịch sử nhập xuất</h2></div>
    <nz-card>
      <div class="toolbar">
        <nz-select nzAllowClear nzPlaceHolder="Loại phiếu" [(ngModel)]="type" (ngModelChange)="reload()">
          @for (t of types; track t) { <nz-option [nzValue]="t" [nzLabel]="label[t]"></nz-option> }
        </nz-select>
        <nz-select nzAllowClear nzPlaceHolder="Kho" [(ngModel)]="warehouseId" (ngModelChange)="reload()">
          @for (w of warehouses(); track w.id) { <nz-option [nzValue]="w.id" [nzLabel]="w.code"></nz-option> }
        </nz-select>
        <nz-range-picker [(ngModel)]="range" (ngModelChange)="reload()" nzFormat="dd/MM/yyyy"></nz-range-picker>
        <nz-input-wrapper><span nzInputPrefix nz-icon nzType="search"></span><input nz-input placeholder="Mã phiếu, sản phẩm" [(ngModel)]="search" (ngModelChange)="reload()" /></nz-input-wrapper>
      </div>
      <nz-table #t [nzData]="items()" [nzFrontPagination]="false" [nzTotal]="total()" [nzPageIndex]="page" [nzPageSize]="20" [nzLoading]="loading()"
        (nzQueryParams)="onQuery($event)" nzSize="middle" [nzScroll]="{ x: '900px' }">
        <thead><tr><th>Thời gian</th><th>Loại</th><th>Mã phiếu</th><th>Sản phẩm</th><th class="num">SL</th><th>Kho</th><th>Người lập</th></tr></thead>
        <tbody>
          @for (m of t.data; track m.id) {
            <tr>
              <td>{{ m.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td><nz-tag [nzColor]="color[m.type]">{{ label[m.type] }}</nz-tag></td>
              <td><code>{{ m.referenceCode }}</code></td>
              <td>{{ m.product.name }}</td>
              <td class="num">{{ m.quantity }}</td>
              <td>{{ m.warehouse.code }}@if (m.toWarehouse) { → {{ m.toWarehouse.code }} }</td>
              <td>{{ m.createdBy?.fullName }}</td>
            </tr>
          }
        </tbody>
      </nz-table>
    </nz-card>
  `,
})
export class MovementsPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<Movement[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly types: MovementType[] = ['IN', 'OUT', 'TRANSFER', 'ADJUST'];
  protected readonly label = MOVEMENT_LABEL;
  protected readonly color = MOVEMENT_COLOR;
  protected type: MovementType | null = null;
  protected warehouseId: number | null = null;
  protected range: Date[] = [];
  protected search = '';
  protected page = 1;
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.api.warehouses().subscribe((w) => this.warehouses.set(w));
  }

  onQuery(q: NzTableQueryParams) {
    this.page = q.pageIndex;
    this.load();
  }

  reload() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.page = 1;
      this.load();
    }, 300);
  }

  load() {
    this.loading.set(true);
    const [from, to] = this.range ?? [];
    this.api
      .movements({
        page: this.page,
        limit: 20,
        type: this.type,
        warehouseId: this.warehouseId,
        search: this.search,
        from: from ? ymd(from) : null,
        to: to ? ymd(to) : null,
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
