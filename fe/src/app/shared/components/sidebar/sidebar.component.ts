import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  isCollapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Xe', route: '/vehicles', icon: 'vehicle' },
    { label: 'Tài xế', route: '/drivers', icon: 'driver' },
    { label: 'Tuyến đường', route: '/routes', icon: 'route' },
    { label: 'Chuyến đi', route: '/trips', icon: 'trip' },
    { label: 'Đặt vé', route: '/bookings', icon: 'booking' },
  ];

  get userInitial(): string {
    const name = this.authService.user()?.name;
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  get displayName(): string {
    return this.authService.user()?.name ?? 'User';
  }

  get displayRole(): string {
    return this.authService.user()?.role?.name ?? 'Staff';
  }

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }

  isActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }
}
