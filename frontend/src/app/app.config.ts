import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import vi from '@angular/common/locales/vi';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  ApiOutline,
  ContainerOutline,
  DashboardOutline,
  DatabaseOutline,
  EditOutline,
  HistoryOutline,
  HomeOutline,
  InboxOutline,
  LockOutline,
  LogoutOutline,
  MenuFoldOutline,
  MenuUnfoldOutline,
  PlusOutline,
  RobotOutline,
  SearchOutline,
  SendOutline,
  ShoppingOutline,
  SwapOutline,
  TeamOutline,
  UserOutline,
  WarningOutline,
} from '@ant-design/icons-angular/icons';
import { provideNzI18n, vi_VN } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { provideNzNativeDateAdapter } from 'ng-zorro-antd/core/time';
import { authInterceptor } from './core/auth.interceptor';
import { routes } from './app.routes';

registerLocaleData(vi);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideNzI18n(vi_VN),
    provideNzNativeDateAdapter(),
    { provide: LOCALE_ID, useValue: 'vi' },
    provideNzIcons([
      ApiOutline, ContainerOutline, DashboardOutline, DatabaseOutline, EditOutline, HistoryOutline,
      HomeOutline, InboxOutline, LockOutline, LogoutOutline, MenuFoldOutline, MenuUnfoldOutline,
      PlusOutline, RobotOutline, SearchOutline, SendOutline, ShoppingOutline, SwapOutline,
      TeamOutline, UserOutline, WarningOutline,
    ]),
  ],
};
