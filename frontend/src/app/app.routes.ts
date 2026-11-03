import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Tổng quan', loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'products', title: 'Sản phẩm', loadComponent: () => import('./pages/products.page').then((m) => m.ProductsPage) },
      { path: 'stock', title: 'Tồn kho', loadComponent: () => import('./pages/stock-levels.page').then((m) => m.StockLevelsPage) },
      { path: 'documents/new', title: 'Lập phiếu', loadComponent: () => import('./pages/stock-document.page').then((m) => m.StockDocumentPage) },
      { path: 'movements', title: 'Lịch sử nhập xuất', loadComponent: () => import('./pages/movements.page').then((m) => m.MovementsPage) },
      { path: 'warehouses', title: 'Kho hàng', loadComponent: () => import('./pages/warehouses.page').then((m) => m.WarehousesPage) },
      { path: 'assistant', title: 'Trợ lý AI', loadComponent: () => import('./pages/assistant.page').then((m) => m.AssistantPage) },
      {
        path: 'users',
        title: 'Người dùng',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./pages/users.page').then((m) => m.UsersPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
