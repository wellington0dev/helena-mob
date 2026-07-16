import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getApiBase } from './api-base';
import { AuthResponse, User } from './models';

const TOKEN_KEY = 'helena_token';
const USER_KEY = 'helena_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private get api() { return getApiBase(); }

  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly user = signal<User | null>(this.readUser());
  readonly isLoggedIn = computed(() => this._token() !== null);

  get token(): string | null {
    return this._token();
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  private persist(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._token.set(res.access_token);
    this.user.set(res.user);
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.api}/auth/login`, { email, password }),
    );
    this.persist(res);
  }

  async register(name: string, email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.api}/auth/register`, { name, email, password }),
    );
    this.persist(res);
  }

  /** Atualiza o nome localmente (após editar no perfil). */
  setName(name: string) {
    const u = this.user();
    if (u) {
      const updated = { ...u, name };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      this.user.set(updated);
    }
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this.user.set(null);
  }
}
