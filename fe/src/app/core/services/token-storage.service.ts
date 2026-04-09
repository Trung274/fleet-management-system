import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { User } from '../models/auth.model';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  constructor(private cookieService: CookieService) {}

  private get isProduction(): boolean {
    return false; // replaced by environment in a real app
  }

  private cookieOptions(rememberMe: boolean, expiresDays?: number) {
    return {
      secure: this.isProduction,
      sameSite: 'Strict' as const,
      path: '/',
      expires: rememberMe && expiresDays ? expiresDays : undefined,
    };
  }

  // ─── Access Token ─────────────────────────────────────────────
  setToken(token: string, rememberMe = false): void {
    this.cookieService.set(TOKEN_KEY, token, {
      ...this.cookieOptions(rememberMe, 7),
    });
  }

  getToken(): string | null {
    return this.cookieService.get(TOKEN_KEY) || null;
  }

  removeToken(): void {
    this.cookieService.delete(TOKEN_KEY, '/');
  }

  // ─── Refresh Token ────────────────────────────────────────────
  setRefreshToken(token: string, rememberMe = false): void {
    this.cookieService.set(REFRESH_TOKEN_KEY, token, {
      ...this.cookieOptions(rememberMe, 30),
    });
  }

  getRefreshToken(): string | null {
    return this.cookieService.get(REFRESH_TOKEN_KEY) || null;
  }

  removeRefreshToken(): void {
    this.cookieService.delete(REFRESH_TOKEN_KEY, '/');
  }

  // ─── User Data ────────────────────────────────────────────────
  setUser(user: User, rememberMe = false): void {
    this.cookieService.set(USER_KEY, JSON.stringify(user), {
      ...this.cookieOptions(rememberMe, 7),
    });
  }

  getUser(): User | null {
    const raw = this.cookieService.get(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  removeUser(): void {
    this.cookieService.delete(USER_KEY, '/');
  }

  // ─── Clear All ────────────────────────────────────────────────
  clearAll(): void {
    this.removeToken();
    this.removeRefreshToken();
    this.removeUser();
  }
}
