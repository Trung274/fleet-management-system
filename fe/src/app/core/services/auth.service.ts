import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import {
  LoginCredentials,
  LoginResponse,
  RefreshTokenResponse,
  User,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  // ─── Signals (state) ──────────────────────────────────────────
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);
  private _refreshToken = signal<string | null>(null);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // ─── Public computed ──────────────────────────────────────────
  user = this._user.asReadonly();
  token = this._token.asReadonly();
  isLoading = this._isLoading.asReadonly();
  error = this._error.asReadonly();
  isAuthenticated = computed(
    () => !!(this._token() && this._user()),
  );

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private router: Router,
    private toastr: ToastrService,
  ) {
    // Restore state from cookies on service init
    this._user.set(tokenStorage.getUser());
    this._token.set(tokenStorage.getToken());
    this._refreshToken.set(tokenStorage.getRefreshToken());
  }

  // ─── Login ────────────────────────────────────────────────────
  async login(credentials: LoginCredentials): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
          email: credentials.email,
          password: credentials.password,
        }),
      );

      const { user, token, refreshToken } = response.data;
      const rememberMe = credentials.rememberMe ?? false;

      this.tokenStorage.setToken(token, rememberMe);
      this.tokenStorage.setRefreshToken(refreshToken, rememberMe);
      this.tokenStorage.setUser(user, rememberMe);

      this._user.set(user);
      this._token.set(token);
      this._refreshToken.set(refreshToken);
      this._error.set(null);
    } catch (err: any) {
      const message = err?.error?.message ?? 'Đăng nhập thất bại';
      this._error.set(message);
      throw err;
    } finally {
      this._isLoading.set(false);
    }
  }

  // ─── Logout ───────────────────────────────────────────────────
  async logout(): Promise<void> {
    this._isLoading.set(true);
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/auth/logout`, {}));
    } catch {
      // Continue even if API fails
    } finally {
      this.tokenStorage.clearAll();
      this._user.set(null);
      this._token.set(null);
      this._refreshToken.set(null);
      this._isLoading.set(false);
    }
  }

  // ─── Refresh Access Token ─────────────────────────────────────
  async refreshAccessToken(): Promise<boolean> {
    const currentRefreshToken = this.tokenStorage.getRefreshToken();
    if (!currentRefreshToken) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<RefreshTokenResponse>(`${this.apiUrl}/auth/refresh-token`, {
          refreshToken: currentRefreshToken,
        }),
      );

      const { token: newToken } = response.data;
      this.tokenStorage.setToken(newToken, true);
      this._token.set(newToken);
      return true;
    } catch {
      this.tokenStorage.clearAll();
      this._user.set(null);
      this._token.set(null);
      this._refreshToken.set(null);
      return false;
    }
  }

  // ─── Check Auth (on app init / page refresh) ──────────────────
  async checkAuth(): Promise<void> {
    const token = this.tokenStorage.getToken();
    const refreshToken = this.tokenStorage.getRefreshToken();
    const user = this.tokenStorage.getUser();

    if (!token || !refreshToken || !user) {
      this.clearAuth();
      return;
    }

    this._isLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: User }>(`${this.apiUrl}/auth/me`),
      );
      this._user.set(response.data);
      this._token.set(token);
      this._refreshToken.set(refreshToken);
    } catch {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        try {
          const response = await firstValueFrom(
            this.http.get<{ success: boolean; data: User }>(`${this.apiUrl}/auth/me`),
          );
          this._user.set(response.data);
        } catch {
          this.clearAuth();
        }
      } else {
        this.clearAuth();
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────
  clearError(): void {
    this._error.set(null);
  }

  updateUser(user: User): void {
    this._user.set(user);
    this.tokenStorage.setUser(user, !!this.tokenStorage.getRefreshToken());
  }

  private clearAuth(): void {
    this.tokenStorage.clearAll();
    this._user.set(null);
    this._token.set(null);
    this._refreshToken.set(null);
    this._isLoading.set(false);
  }
}
