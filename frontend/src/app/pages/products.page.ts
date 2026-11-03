import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Category, Product } from '../core/models';
import { formatVnd } from '../shared/format';

@Component({
  selector: 'app-products',
  imports: [FormsModule, NzTableModule, NzCardModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzCheckboxModule, NzTagModule, NzModalModule, NzFormModule, NzInputNumberModule],
  template: `
    <div class="page-title">
      <h2>Sản phẩm</h2>
      @if (canEdit) {
        <button nz-button nzType="primary" (click)="open()"><span nz-icon nzType="plus"></span>Thêm sản phẩm</button>
      }
    </div>
    <nz-card>
      <div class="toolbar">
        <nz-input-wrapper><span nzInputPrefix nz-icon nzType="search"></span><input nz-input placeholder="Tìm theo tên hoặc SKU" [(ngModel)]="search" (ngModelChange)="reload()" /></nz-input-wrapper>
        <nz-select nzAllowClear nzPlaceHolder="Danh mục" [(ngModel)]="categoryId" (ngModelChange)="reload()">
          @for (c of categories(); track c.id) { <nz-option [nzValue]="c.id" [nzLabel]="c.name"></nz-option> }
        </nz-select>
        <label nz-checkbox [(ngModel)]="low" (ngModelChange)="reload()">Chỉ hàng sắp hết</label>
      </div>
      <nz-table #t [nzData]="items()" [nzFrontPagination]="false" [nzTotal]="total()" [nzPageIndex]="page" [nzPageSize]="20"
        [nzLoading]="loading()" (nzQueryParams)="onQuery($event)" nzSize="middle" [nzScroll]="{ x: '820px' }">
        <thead><tr><th>SKU</th><th>Tên sản phẩm</th><th>Danh mục</th><th class="num">Giá</th><th class="num">Tồn kho</th><th class="num">Tối thiểu</th><th>Trạng thái</th>@if (canEdit) {<th></th>}</tr></thead>
        <tbody>
          @for (p of t.data; track p.id) {
            <tr>
              <td><code>{{ p.sku }}</code></td>
              <td>{{ p.name }}</td>
              <td>{{ p.category?.name }}</td>
              <td class="num">{{ vnd(p.price) }}</td>
              <td class="num"><nz-tag [nzColor]="p.totalStock <= p.minStock ? 'red' : 'green'">{{ p.totalStock }} {{ p.unit }}</nz-tag></td>
              <td class="num">{{ p.minStock }}</td>
              <td>@if (p.isActive) {<nz-tag nzColor="blue">Đang bán</nz-tag>} @else {<nz-tag>Ngừng</nz-tag>}</td>
              @if (canEdit) { <td><a (click)="open(p)"><span nz-icon nzType="edit"></span></a></td> }
            </tr>
          }
        </tbody>
      </nz-table>
    </nz-card>

    <nz-modal [nzVisible]="editing() !== null" [nzTitle]="form.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'" (nzOnCancel)="editing.set(null)" (nzOnOk)="save()" [nzOkLoading]="saving()" nzOkText="Lưu">
      <ng-container *nzModalContent>
        <form nz-form nzLayout="vertical">
          <nz-form-item><nz-form-label nzRequired>SKU</nz-form-label><input nz-input name="sku" [(ngModel)]="form.sku" /></nz-form-item>
          <nz-form-item><nz-form-label nzRequired>Tên</nz-form-label><input nz-input name="name" [(ngModel)]="form.name" /></nz-form-item>
          <div class="grid2">
            <nz-form-item><nz-form-label>Danh mục</nz-form-label>
              <nz-select name="cat" nzAllowClear [(ngModel)]="form.categoryId">
                @for (c of categories(); track c.id) { <nz-option [nzValue]="c.id" [nzLabel]="c.name"></nz-option> }
              </nz-select>
            </nz-form-item>
            <nz-form-item><nz-form-label>Đơn vị</nz-form-label><input nz-input name="unit" [(ngModel)]="form.unit" /></nz-form-item>
            <nz-form-item><nz-form-label>Giá (₫)</nz-form-label><nz-input-number name="price" [(ngModel)]="form.price" [nzMin]="0" [nzStep]="10000" class="w100"></nz-input-number></nz-form-item>
            <nz-form-item><nz-form-label>Tồn tối thiểu</nz-form-label><nz-input-number name="min" [(ngModel)]="form.minStock" [nzMin]="0" class="w100"></nz-input-number></nz-form-item>
          </div>
          @if (form.id) { <label nz-checkbox name="active" [(ngModel)]="form.isActive">Đang kinh doanh</label> }
        </form>
      </ng-container>
    </nz-modal>
  `,
  styles: `.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; } .w100 { width: 100%; }`,
})
export class ProductsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly msg = inject(NzMessageService);
  readonly lowStock = input<string>(); // bound from ?lowStock=true

  protected readonly canEdit = inject(AuthService).hasRole('MANAGER');
  protected readonly items = signal<Product[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly editing = signal<Partial<Product> | null>(null);
  protected readonly saving = signal(false);
  protected readonly vnd = formatVnd;
  protected search = '';
  protected categoryId: number | null = null;
  protected low = false;
  protected page = 1;
  protected form: Partial<Product> = {};
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.low = this.lowStock() === 'true';
    this.api.categories().subscribe((c) => this.categories.set(c));
  }

  onQuery(q: NzTableQueryParams) {
    this.page = q.pageIndex;
    this.load();
  }

  /** Debounced so typing in the search box doesn't fire a request per key. */
  reload() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.page = 1;
      this.load();
    }, 300);
  }

  load() {
    this.loading.set(true);
    this.api
      .products({ page: this.page, limit: 20, search: this.search, categoryId: this.categoryId, lowStock: this.low || null })
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  open(p?: Product) {
    this.form = p
      ? { id: p.id, sku: p.sku, name: p.name, unit: p.unit, price: p.price, minStock: p.minStock, categoryId: p.categoryId, isActive: p.isActive }
      : { unit: 'pcs', price: 0, minStock: 0 };
    this.editing.set(this.form);
  }

  save() {
    const { id, ...body } = this.form;
    if (!body.sku || !body.name) return void this.msg.warning('Vui lòng nhập SKU và tên');
    this.saving.set(true);
    this.api.saveProduct(body, id).subscribe({
      next: () => {
        this.msg.success('Đã lưu sản phẩm');
        this.editing.set(null);
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }
}
