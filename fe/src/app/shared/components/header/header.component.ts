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

  constructor(
    public authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

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
