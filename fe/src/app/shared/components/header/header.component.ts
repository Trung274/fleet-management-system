import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  isDropdownOpen = signal(false);
  isLoggingOut = signal(false);
  isLangDropdownOpen = signal(false);
  isDarkMode = signal(true); // Default theme of the layout is dark
  isNotificationOpen = signal(false);
  isHelpOpen = signal(false);

  notifications = [
    { id: 1, title: 'Cảnh báo tốc độ', message: 'Xe 29B-123.45 vượt quá tốc độ cho phép (85/80 km/h)', time: '5 phút trước', type: 'warning' },
    { id: 2, title: 'Báo cáo sự cố', message: 'Tài xế Trần Văn B báo cáo xe bị hỏng lốp tại Quốc lộ 1A', time: '12 phút trước', type: 'error' },
    { id: 3, title: 'Lịch bảo dưỡng', message: 'Xe 30A-999.99 sắp đến hạn bảo dưỡng định kỳ', time: '1 giờ trước', type: 'info' }
  ];

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
    if (url.startsWith('/drivers')) return 'Quản lý tài xế';
    if (url.startsWith('/routes')) return 'Quản lý tuyến đường';
    if (url.startsWith('/trips')) return 'Quản lý chuyến đi';
    if (url.startsWith('/bookings')) return 'Quản lý đặt vé';
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

  async handleLogout(): Promise<void> {
    this.closeDropdown();
    this.isLoggingOut.set(true);
    try {
      await this.authService.logout();
      this.toastr.info('Đã đăng xuất', 'Tạm biệt');
      this.router.navigate(['/login']);
    } finally {
      this.isLoggingOut.set(false);
    }
  }
}
