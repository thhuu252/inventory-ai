import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, switchMap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ApiService, StockDocument } from '../core/api.service';
import { Product, Warehouse } from '../core/models';

type DocType = 'IN' | 'OUT' | 'TRANSFER';
interface Line {
  product: Product | null;
  quantity: number;
}

@Component({
  selector: 'app-stock-document',
  imports: [FormsModule, NzCardModule, NzFormModule, NzRadioModule, NzSelectModule, NzInputModule, NzInputNumberModule, NzButtonModule, NzIconModule, NzTableModule],
  template: `
    <div class="page-title"><h2>Lập phiếu kho</h2></div>
    <nz-card>
      <nz-radio-group [(ngModel)]="type" nzButtonStyle="solid" class="mb">
        <label nz-radio-button nzValue="IN">Phiếu nhập</label>
        <label nz-radio-button nzValue="OUT">Phiếu xuất</label>
        <label nz-radio-button nzValue="TRANSFER">Chuyển kho</label>
      </nz-radio-group>

      <div class="grid">
        <div>
          <label class="lbl">{{ type === 'TRANSFER' ? 'Kho xuất' : 'Kho' }}</label>
          <nz-select [(ngModel)]="warehouseId" nzPlaceHolder="Chọn kho" class="w100">
            @for (w of warehouses(); track w.id) { <nz-option [nzValue]="w.id" [nzLabel]="w.code + ' – ' + w.name"></nz-option> }
          </nz-select>
        </div>
        @if (type === 'TRANSFER') {
          <div>
            <label class="lbl">Kho nhận</label>
            <nz-select [(ngModel)]="toWarehouseId" nzPlaceHolder="Chọn kho nhận" class="w100">
              @for (w of warehouses(); track w.id) {
                @if (w.id !== warehouseId) { <nz-option [nzValue]="w.id" [nzLabel]="w.code + ' – ' + w.name"></nz-option> }
              }
            </nz-select>
          </div>
        }
        <div>
          <label class="lbl">Mã chứng từ (tuỳ chọn)</label>
          <input nz-input [(ngModel)]="referenceCode" placeholder="VD: PO-2026-001" />
        </div>
        <div>
          <label class="lbl">Ghi chú</label>
          <input nz-input [(ngModel)]="note" />
        </div>
      </div>

      <nz-table [nzData]="lines()" [nzShowPagination]="false" nzSize="small" class="mt" [nzScroll]="{ x: '560px' }">
        <thead><tr><th>Sản phẩm</th><th style="width: 140px">Số lượng</th><th class="num" style="width: 110px">Tồn hiện tại</th><th style="width: 48px"></th></tr></thead>
        <tbody>
          @for (line of lines(); track $index; let i = $index) {
            <tr>
              <td>
                <nz-select nzShowSearch nzServerSearch nzPlaceHolder="Gõ để tìm sản phẩm" class="w100"
                  [(ngModel)]="line.product" (nzOnSearch)="search$.next($event)" [compareWith]="sameProduct" (ngModelChange)="touch()">
                  @if (line.product) { <nz-option [nzValue]="line.product" [nzLabel]="line.product.sku + ' – ' + line.product.name" nzHide></nz-option> }
                  @for (p of options(); track p.id) { <nz-option [nzValue]="p" [nzLabel]="p.sku + ' – ' + p.name"></nz-option> }
                </nz-select>
              </td>
              <td><nz-input-number [(ngModel)]="line.quantity" [nzMin]="1" class="w100" (ngModelChange)="touch()"></nz-input-number></td>
              <td class="num">{{ line.product ? line.product.totalStock + ' ' + line.product.unit : '' }}</td>
              <td><a (click)="remove(i)" [class.disabled]="lines().length === 1">✕</a></td>
            </tr>
          }
        </tbody>
      </nz-table>
      <button nz-button nzType="dashed" class="mt" (click)="add()"><span nz-icon nzType="plus"></span>Thêm dòng</button>

      <div class="footer">
        <span class="muted">{{ validLines().length }} mặt hàng · tổng {{ totalQty() }} đơn vị</span>
        <button nz-button nzType="primary" [nzLoading]="saving()" [disabled]="!canSubmit()" (click)="submit()">Lưu phiếu</button>
      </div>
    </nz-card>
  `,
  styles: `
    .mb { margin-bottom: 16px; } .mt { margin-top: 12px; } .w100 { width: 100%; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .lbl { display: block; margin-bottom: 4px; font-weight: 500; }
    .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; flex-wrap: wrap; gap: 8px; }
    .disabled { pointer-events: none; opacity: .3; }
  `,
})
export class StockDocumentPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly msg = inject(NzMessageService);
  private readonly router = inject(Router);

  protected type: DocType = 'IN';
  protected warehouseId: number | null = null;
  protected toWarehouseId: number | null = null;
  protected referenceCode = '';
  protected note = '';
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly options = signal<Product[]>([]);
  protected readonly lines = signal<Line[]>([{ product: null, quantity: 1 }]);
  protected readonly saving = signal(false);
  protected readonly search$ = new Subject<string>();

  protected readonly validLines = computed(() => this.lines().filter((l) => l.product && l.quantity > 0));
  protected readonly totalQty = computed(() => this.validLines().reduce((s, l) => s + l.quantity, 0));
  protected readonly sameProduct = (a: Product | null, b: Product | null) => a?.id === b?.id;

  ngOnInit() {
    this.api.warehouses().subscribe((w) => this.warehouses.set(w.filter((x) => x.isActive)));
    this.search$
      .pipe(debounceTime(250), switchMap((s) => this.api.products({ search: s, limit: 20 })))
      .subscribe((r) => this.options.set(r.items.filter((p) => p.isActive)));
    this.search$.next('');
  }

  /** Lines are mutated in place by ngModel; re-emit so computed totals update. */
  touch() {
    this.lines.update((l) => [...l]);
  }

  add() {
    this.lines.update((l) => [...l, { product: null, quantity: 1 }]);
  }

  remove(i: number) {
    this.lines.update((l) => l.filter((_, idx) => idx !== i));
  }

  canSubmit() {
    return !!this.warehouseId && this.validLines().length > 0 && (this.type !== 'TRANSFER' || !!this.toWarehouseId);
  }

  submit() {
    const doc: StockDocument = {
      referenceCode: this.referenceCode || undefined,
      note: this.note || undefined,
      items: this.validLines().map((l) => ({ productId: l.product!.id, quantity: l.quantity })),
    };
    const req =
      this.type === 'IN'
        ? this.api.stockIn({ ...doc, warehouseId: this.warehouseId! })
        : this.type === 'OUT'
          ? this.api.stockOut({ ...doc, warehouseId: this.warehouseId! })
          : this.api.transfer({ ...doc, fromWarehouseId: this.warehouseId!, toWarehouseId: this.toWarehouseId! });
    this.saving.set(true);
    req.subscribe({
      next: (res) => {
        this.msg.success(`Đã lưu phiếu ${res[0]?.referenceCode ?? ''}`);
        void this.router.navigate(['/movements']);
      },
      error: () => this.saving.set(false),
    });
  }
}
