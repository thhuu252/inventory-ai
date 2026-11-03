import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { Role, User } from './models';

const STORAGE_KEY = 'inventory-ai.session';

interface Session {
  accessToken: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<Session | null>(this.restore());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.accessToken ?? null);
  readonly isLoggedIn = computed(() => !!this.session());

  login(email: string, password: string) {
    return this.http.post<Session>('/api/auth/login', { email, password }).pipe(
      tap((s) => {
        this.session.set(s);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        } catch {
          /* storage unavailable: session lasts for this tab only */
        }
      }),
    );
  }

  logout() {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    void this.router.navigate(['/login']);
  }

  /** ADMIN always passes. */
  hasRole(...roles: Role[]) {
    const role = this.user()?.role;
    return !!role && (role === 'ADMIN' || roles.includes(role));
  }

  private restore(): Session | null {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Session | null;
      if (!s) return null;
      const payload = JSON.parse(atob(s.accessToken.split('.')[1]));
      return payload.exp * 1000 > Date.now() ? s : null;
    } catch {
      return null;
    }
  }
}
