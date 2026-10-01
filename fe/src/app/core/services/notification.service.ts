import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models/notification.model';

const READ_KEY = 'fleet.notifications.read';

/**
 * Header bell alerts. The backend computes them on every request (nothing stored),
 * so "read" is remembered in this browser only: ids are stable until the situation
 * changes, which makes a changed situation show up as unread again.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private _items = signal<AppNotification[]>([]);
  private _readIds = signal<Set<string>>(this.loadReadIds());
  private _isLoading = signal(false);

  items = this._items.asReadonly();
  isLoading = this._isLoading.asReadonly();
  unreadCount = computed(() => this._items().filter(n => !this._readIds().has(n.id)).length);

  isRead(n: AppNotification): boolean {
    return this._readIds().has(n.id);
  }

  async refresh(): Promise<void> {
    this._isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: AppNotification[] }>(`${environment.apiUrl}/notifications`)
      );
      this._items.set(res.data);
      // Forget read ids of alerts that no longer exist so storage does not grow forever
      const current = new Set(res.data.map(n => n.id));
      this.saveReadIds(new Set([...this._readIds()].filter(id => current.has(id))));
    } catch {
      // Keep the last list; the bell is not worth an error toast
    } finally {
      this._isLoading.set(false);
    }
  }

  markRead(n: AppNotification): void {
    this.saveReadIds(new Set([...this._readIds(), n.id]));
  }

  markAllRead(): void {
    this.saveReadIds(new Set([...this._readIds(), ...this._items().map(n => n.id)]));
  }

  /** On logout: next user starts with an empty list */
  clear(): void {
    this._items.set([]);
  }

  private loadReadIds(): Set<string> {
    if (!this.isBrowser) return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]'));
    } catch {
      return new Set();
    }
  }

  private saveReadIds(ids: Set<string>): void {
    this._readIds.set(ids);
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
    } catch {
      // Storage unavailable (private mode, quota) — read state lasts for this session only
    }
  }
}
