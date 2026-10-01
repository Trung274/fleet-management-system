import { Component, signal, HostListener, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AppNotification } from '../../../core/models/notification.model';

/** How often the bell re-checks for alerts */
const NOTIFICATION_REFRESH_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit, OnDestroy {
  isDropdownOpen = signal(false);
  isLoggingOut = signal(false);
  isLangDropdownOpen = signal(false);
  isDarkMode = signal(true); // Default theme of the layout is dark
  isNotificationOpen = signal(false);
  isHelpOpen = signal(false);

  // ─── Notifications (real alerts from GET /notifications) ─────
  notificationService = inject(NotificationService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private refreshTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.notificationService.refresh();
    this.refreshTimer = setInterval(() => this.notificationService.refresh(), NOTIFICATION_REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  openNotification(n: AppNotification): void {
    this.notificationService.markRead(n);
    this.isNotificationOpen.set(false);
    this.router.navigate([n.link]);
  }

  notificationTime(n: AppNotification): string {
    return new Date(n.date).toLocaleDateString('vi-VN');
  }

  toggleTheme(): void {
    this.isDarkMode.update((v) => !v);
  }

  toggleLangDropdown(): void {
    this.isLangDropdownOpen.update((v) => !v);
  }

  setLanguage(lang: string): void {
    this.isLangDropdownOpen.set(false);
  }

  toggleNotifications(): void {
    this.isNotificationOpen.update((v) => !v);
    // Fresh list every time the bell is opened
    if (this.isNotificationOpen()) this.notificationService.refresh();
  }

  toggleHelp(): void {
    this.isHelpOpen.update((v) => !v);
  }

  constructor(
    public authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  get pageTitle(): string {
    const url = this.router.url;
    if (url.startsWith('/dashboard')) return 'Tổng quan';
    if (url.startsWith('/vehicles')) return 'Quản lý phương tiện';
    if (url.startsWith('/maintenance')) return 'Bảo dưỡng & đăng kiểm';
    if (url.startsWith('/drivers')) return 'Quản lý tài xế';
    if (url.startsWith('/routes')) return 'Quản lý tuyến đường';
    if (url.startsWith('/trips')) return 'Quản lý chuyến đi';
    if (url.startsWith('/bookings')) return 'Quản lý đặt vé';
    if (url.startsWith('/itineraries')) return 'Hành trình nhiều chặng';
    if (url.startsWith('/users')) return 'Quản lý người dùng';
    if (url.startsWith('/roles')) return 'Vai trò & phân quyền';
    if (url.startsWith('/profile')) return 'Hồ sơ của tôi';
    return 'Hệ thống điều hành';
  }

  get userInitial(): string {
    const name = this.authService.user()?.name;
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  get displayName(): string {
    return this.authService.user()?.name ?? 'User';
  }

  get displayEmail(): string {
    return this.authService.user()?.email ?? '';
  }

  get isActive(): boolean {
    return this.authService.user()?.isActive ?? false;
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update((v) => !v);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-dropdown')) {
      this.closeDropdown();
    }
    if (!target.closest('.lang-dropdown-wrapper')) {
      this.isLangDropdownOpen.set(false);
    }
    if (!target.closest('.notification-wrapper')) {
      this.isNotificationOpen.set(false);
    }
    if (!target.closest('.help-wrapper')) {
      this.isHelpOpen.set(false);
    }
  }

  goToProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/profile']);
  }

  async handleLogout(): Promise<void> {
    this.closeDropdown();
    this.isLoggingOut.set(true);
    try {
      await this.authService.logout();
      this.notificationService.clear();
      this.toastr.info('Đã đăng xuất', 'Tạm biệt');
      this.router.navigate(['/login']);
    } finally {
      this.isLoggingOut.set(false);
    }
  }
}
