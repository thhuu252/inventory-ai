import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ApiService } from '../core/api.service';
import { StockLevel, Warehouse } from '../core/models';

@Component({
  selector: 'app-stock-levels',
  imports: [FormsModule, NzCardModule, NzTableModule, NzSelectModule, NzInputModule, NzTagModule, NzIconModule],
  template: `
    <div class="page-title"><h2>Tồn kho theo kho</h2></div>
    <nz-card>
      <div class="toolbar">
        <nz-select nzAllowClear nzPlaceHolder="Tất cả kho" [(ngModel)]="warehouseId" (ngModelChange)="reload()">
          @for (w of warehouses(); track w.id) { <nz-option [nzValue]="w.id" [nzLabel]="w.code + ' – ' + w.name"></nz-option> }
        </nz-select>
        <nz-input-wrapper><span nzInputPrefix nz-icon nzType="search"></span><input nz-input placeholder="Tìm sản phẩm" [(ngModel)]="search" (ngModelChange)="reload()" /></nz-input-wrapper>
      </div>
      <nz-table #t [nzData]="items()" [nzFrontPagination]="false" [nzTotal]="total()" [nzPageIndex]="page" [nzPageSize]="20" [nzLoading]="loading()"
        (nzQueryParams)="onQuery($event)" nzSize="middle" [nzScroll]="{ x: '600px' }">
        <thead><tr><th>Kho</th><th>SKU</th><th>Sản phẩm</th><th class="num">Số lượng</th></tr></thead>
        <tbody>
          @for (s of t.data; track s.id) {
            <tr>
              <td><nz-tag>{{ s.warehouse.code }}</nz-tag></td>
              <td><code>{{ s.product.sku }}</code></td>
              <td>{{ s.product.name }}</td>
              <td class="num"><b [class.danger]="s.quantity === 0">{{ s.quantity }}</b> {{ s.product.unit }}</td>
            </tr>
          }
        </tbody>
      </nz-table>
    </nz-card>
  `,
  styles: `.danger { color: #cf1322; }`,
})
export class StockLevelsPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<StockLevel[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected warehouseId: number | null = null;
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
    this.api.levels({ page: this.page, limit: 20, warehouseId: this.warehouseId, search: this.search }).subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
