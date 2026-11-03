export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';
export type MovementType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  isActive?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  price: number;
  minStock: number;
  description?: string;
  isActive: boolean;
  categoryId?: number;
  category?: Category;
  totalStock: number;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
  productCount?: number;
  totalUnits?: number;
}

export interface StockLevel {
  id: number;
  quantity: number;
  product: Pick<Product, 'id' | 'sku' | 'name' | 'unit' | 'minStock'>;
  warehouse: Pick<Warehouse, 'id' | 'code' | 'name'>;
}

export interface Movement {
  id: number;
  type: MovementType;
  quantity: number;
  referenceCode?: string;
  note?: string;
  createdAt: string;
  product: Pick<Product, 'id' | 'sku' | 'name' | 'unit'>;
  warehouse: Pick<Warehouse, 'id' | 'code' | 'name'>;
  toWarehouse?: Pick<Warehouse, 'id' | 'code' | 'name'>;
  createdBy?: { id: number; fullName: string };
}

export interface Summary {
  activeProducts: number;
  activeWarehouses: number;
  totalUnits: number;
  stockValue: number;
  movementsToday: number;
  lowStockCount: number;
}

export interface LowStockItem {
  id: number;
  sku: string;
  name: string;
  unit: string;
  minStock: number;
  totalStock: number;
}

export interface TrendPoint {
  date: string;
  in: number;
  out: number;
}

export interface TopProduct {
  id: number;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
}

export interface WarehouseValue {
  id: number;
  code: string;
  name: string;
  totalUnits: number;
  stockValue: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; args: Record<string, unknown> }[];
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  IN: 'Nhập kho',
  OUT: 'Xuất kho',
  TRANSFER: 'Chuyển kho',
  ADJUST: 'Điều chỉnh',
};

export const MOVEMENT_COLOR: Record<MovementType, string> = {
  IN: 'green',
  OUT: 'volcano',
  TRANSFER: 'blue',
  ADJUST: 'purple',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Quản trị',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên kho',
};
