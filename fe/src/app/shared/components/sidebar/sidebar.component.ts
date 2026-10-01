import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  /** Hidden unless the user has this permission (same as the page's route guard) */
  permission?: { resource: string; action: string };
  /** Only for the admin role (backend uses authorize('admin'), not a permission) */
  adminOnly?: boolean;
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
    { label: 'Xe', route: '/vehicles', icon: 'vehicle', permission: { resource: 'vehicles', action: 'read' } },
    { label: 'Tài xế', route: '/drivers', icon: 'driver', permission: { resource: 'drivers', action: 'read' } },
    { label: 'Tuyến đường', route: '/routes', icon: 'route', permission: { resource: 'routes', action: 'read' } },
    { label: 'Chuyến đi', route: '/trips', icon: 'trip', permission: { resource: 'trips', action: 'read' } },
    { label: 'Đặt vé', route: '/bookings', icon: 'booking', permission: { resource: 'bookings', action: 'read' } },
    { label: 'Hành trình', route: '/itineraries', icon: 'itinerary', permission: { resource: 'bookings', action: 'read' } },
    { label: 'Phân quyền', route: '/roles', icon: 'roles', adminOnly: true },
  ];

  // can() reads the user's permission signals, so this updates when the user loads or changes
  visibleNavItems = computed(() =>
    this.navItems.filter(item => {
      if (item.adminOnly) return this.authService.isAdmin();
      return !item.permission || this.authService.can(item.permission.resource, item.permission.action);
    }),
  );

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
