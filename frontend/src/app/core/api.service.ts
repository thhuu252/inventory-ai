import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  Category,
  ChatMessage,
  LowStockItem,
  Movement,
  Paginated,
  Product,
  StockLevel,
  Summary,
  TopProduct,
  TrendPoint,
  User,
  Warehouse,
  WarehouseValue,
} from './models';

type Query = Record<string, string | number | boolean | null | undefined>;

const toParams = (q: Query = {}) =>
  Object.entries(q).reduce(
    (p, [k, v]) => (v === null || v === undefined || v === '' ? p : p.set(k, String(v))),
    new HttpParams(),
  );

export interface StockDocument {
  warehouseId?: number;
  fromWarehouseId?: number;
  toWarehouseId?: number;
  referenceCode?: string;
  note?: string;
  items: { productId: number; quantity: number }[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Reports
  summary = () => this.http.get<Summary>('/api/reports/summary');
  lowStock = (limit = 10) => this.http.get<LowStockItem[]>('/api/reports/low-stock', { params: { limit } });
  trend = (days = 14) => this.http.get<TrendPoint[]>('/api/reports/movement-trend', { params: { days } });
  topProducts = (days = 30) => this.http.get<TopProduct[]>('/api/reports/top-products', { params: { days } });
  byWarehouse = () => this.http.get<WarehouseValue[]>('/api/reports/by-warehouse');

  // Products & categories
  products = (q: Query) => this.http.get<Paginated<Product>>('/api/products', { params: toParams(q) });
  saveProduct = (p: Partial<Product>, id?: number) =>
    id ? this.http.patch<Product>(`/api/products/${id}`, p) : this.http.post<Product>('/api/products', p);
  categories = () => this.http.get<Category[]>('/api/categories');

  // Warehouses
  warehouses = () => this.http.get<Warehouse[]>('/api/warehouses');
  saveWarehouse = (w: Partial<Warehouse>, id?: number) =>
    id ? this.http.patch<Warehouse>(`/api/warehouses/${id}`, w) : this.http.post<Warehouse>('/api/warehouses', w);

  // Stock
  levels = (q: Query) => this.http.get<Paginated<StockLevel>>('/api/stock/levels', { params: toParams(q) });
  movements = (q: Query) => this.http.get<Paginated<Movement>>('/api/stock/movements', { params: toParams(q) });
  stockIn = (d: StockDocument) => this.http.post<Movement[]>('/api/stock/in', d);
  stockOut = (d: StockDocument) => this.http.post<Movement[]>('/api/stock/out', d);
  transfer = (d: StockDocument) => this.http.post<Movement[]>('/api/stock/transfer', d);

  // Users
  users = (q: Query) => this.http.get<Paginated<User>>('/api/users', { params: toParams(q) });
  saveUser = (u: Partial<User> & { password?: string }, id?: number) =>
    id ? this.http.patch<User>(`/api/users/${id}`, u) : this.http.post<User>('/api/users', u);

  // AI
  aiStatus = () => this.http.get<{ enabled: boolean }>('/api/ai/status');
  ask = (question: string, history: ChatMessage[]) =>
    this.http.post<{ answer: string; toolCalls: ChatMessage['toolCalls'] }>('/api/ai/ask', {
      question,
      history: history.map(({ role, content }) => ({ role, content })),
    });
}
