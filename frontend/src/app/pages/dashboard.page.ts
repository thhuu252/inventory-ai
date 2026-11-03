import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ApiService } from '../core/api.service';
import { LowStockItem, Summary, TopProduct, TrendPoint, WarehouseValue } from '../core/models';
import { BarChartComponent } from '../shared/bar-chart.component';
import { formatCompact, formatNum, formatVnd } from '../shared/format';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, NzGridModule, NzCardModule, NzStatisticModule, NzTableModule, NzTagModule, NzIconModule, NzSkeletonModule, NzProgressModule, BarChartComponent],
  template: `
    <div class="page-title"><h2>Tổng quan kho hàng</h2></div>
    @if (summary(); as s) {
      <div nz-row [nzGutter]="[16, 16]">
        <div nz-col [nzXs]="12" [nzLg]="6"><nz-card><nz-statistic nzTitle="Giá trị tồn kho" [nzValue]="compact(s.stockValue) + ' ₫'"></nz-statistic></nz-card></div>
        <div nz-col [nzXs]="12" [nzLg]="6"><nz-card><nz-statistic nzTitle="Tổng số lượng tồn" [nzValue]="num(s.totalUnits)"></nz-statistic></nz-card></div>
        <div nz-col [nzXs]="12" [nzLg]="6"><nz-card><nz-statistic nzTitle="Sản phẩm / Kho" [nzValue]="s.activeProducts + ' / ' + s.activeWarehouses"></nz-statistic></nz-card></div>
        <div nz-col [nzXs]="12" [nzLg]="6">
          <nz-card><nz-statistic nzTitle="Sắp hết hàng" [nzValue]="s.lowStockCount" [nzValueStyle]="{ color: s.lowStockCount ? '#cf1322' : '#3f8600' }" [nzPrefix]="warn"></nz-statistic></nz-card>
          <ng-template #warn><span nz-icon nzType="warning"></span></ng-template>
        </div>

        <div nz-col [nzXs]="24" [nzLg]="16">
          <nz-card nzTitle="Nhập / xuất 14 ngày gần nhất"><app-bar-chart [data]="trend()" /></nz-card>
        </div>
        <div nz-col [nzXs]="24" [nzLg]="8">
          <nz-card nzTitle="Giá trị theo kho">
            @for (w of byWarehouse(); track w.id) {
              <div class="wh">
                <div class="wh-head"><b>{{ w.code }}</b> <span class="muted">{{ w.name }}</span><span class="num">{{ vnd(w.stockValue) }}</span></div>
                <nz-progress [nzPercent]="pct(w.stockValue)" [nzShowInfo]="false" nzSize="small"></nz-progress>
              </div>
            }
          </nz-card>
        </div>

        <div nz-col [nzXs]="24" [nzLg]="12">
          <nz-card nzTitle="Cần nhập thêm" [nzExtra]="more">
            <nz-table #low [nzData]="lowStock()" [nzShowPagination]="false" nzSize="small" [nzScroll]="{ x: '420px' }">
              <thead><tr><th>SKU</th><th>Sản phẩm</th><th class="num">Tồn</th><th class="num">Tối thiểu</th></tr></thead>
              <tbody>
                @for (p of low.data; track p.id) {
                  <tr><td>{{ p.sku }}</td><td>{{ p.name }}</td><td class="num"><nz-tag nzColor="red">{{ p.totalStock }}</nz-tag></td><td class="num">{{ p.minStock }}</td></tr>
                }
              </tbody>
            </nz-table>
            <ng-template #more><a routerLink="/products" [queryParams]="{ lowStock: true }">Xem tất cả</a></ng-template>
          </nz-card>
        </div>
        <div nz-col [nzXs]="24" [nzLg]="12">
          <nz-card nzTitle="Xuất nhiều nhất 30 ngày">
            <nz-table #top [nzData]="topProducts()" [nzShowPagination]="false" nzSize="small" [nzScroll]="{ x: '360px' }">
              <thead><tr><th>#</th><th>Sản phẩm</th><th class="num">Đã xuất</th></tr></thead>
              <tbody>
                @for (p of top.data; track p.id; let i = $index) {
                  <tr><td>{{ i + 1 }}</td><td>{{ p.name }}</td><td class="num">{{ num(p.quantity) }} {{ p.unit }}</td></tr>
                }
              </tbody>
            </nz-table>
          </nz-card>
        </div>
      </div>
    } @else {
      <nz-card><nz-skeleton [nzActive]="true" [nzParagraph]="{ rows: 8 }"></nz-skeleton></nz-card>
    }
  `,
  styles: `
    .wh { margin-bottom: 10px; }
    .wh-head { display: flex; gap: 8px; align-items: baseline; }
    .wh-head .num { margin-left: auto; font-size: 13px; }
  `,
})
export class DashboardPage {
  private readonly api = inject(ApiService);
  protected readonly summary = signal<Summary | null>(null);
  protected readonly trend = signal<TrendPoint[]>([]);
  protected readonly lowStock = signal<LowStockItem[]>([]);
  protected readonly topProducts = signal<TopProduct[]>([]);
  protected readonly byWarehouse = signal<WarehouseValue[]>([]);
  protected readonly vnd = formatVnd;
  protected readonly num = formatNum;
  protected readonly compact = formatCompact;

  constructor() {
    forkJoin({
      summary: this.api.summary(),
      trend: this.api.trend(14),
      low: this.api.lowStock(8),
      top: this.api.topProducts(30),
      wh: this.api.byWarehouse(),
    }).subscribe((r) => {
      this.trend.set(r.trend);
      this.lowStock.set(r.low);
      this.topProducts.set(r.top);
      this.byWarehouse.set(r.wh);
      this.summary.set(r.summary);
    });
  }

  pct(v: number) {
    const max = Math.max(1, ...this.byWarehouse().map((w) => w.stockValue));
    return Math.round((v / max) * 100);
  }
}
