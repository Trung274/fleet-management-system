import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardData } from '../../core/models/dashboard.model';
import { Trip, TripStatus } from '../../core/models/trip.model';

interface StatSubItem {
  label: string;
  value: number | string;
  dotColor: string;
}

interface StatCard {
  label: string;
  gradient: string;
  icon: string;
  value: () => number | string;
  subs: () => StatSubItem[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  public authService = inject(AuthService);
  private dashboardService = inject(DashboardService);

  // ─── State ─────────────────────────────────────────────────────
  isLoading = signal(true);
  hasError = signal(false);
  stats = signal<DashboardData | null>(null);

  // ─── Derived stat cards ────────────────────────────────────────
  get statCards(): StatCard[] {
    const s = this.stats();
    return [
      {
        label: 'Tổng số xe',
        gradient: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25))',
        icon: '🚌',
        value: () => s?.vehicles.total ?? '—',
        subs: () => [
          { label: 'Hoạt động', value: s?.vehicles.active ?? '—', dotColor: '#22c55e' },
          { label: 'Bảo trì', value: s?.vehicles.maintenance ?? '—', dotColor: '#eab308' },
          { label: 'Ngưng HĐ', value: s?.vehicles.outOfService ?? '—', dotColor: '#ef4444' }
        ]
      },
      {
        label: 'Tài xế',
        gradient: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.25))',
        icon: '👤',
        value: () => s?.drivers.total ?? '—',
        subs: () => [
          { label: 'Hoạt động', value: s?.drivers.active ?? '—', dotColor: '#22c55e' },
          { label: 'Nghỉ/Khác', value: s?.drivers.inactive ?? '—', dotColor: '#94a3b8' }
        ]
      },
      {
        label: 'Chuyến hôm nay',
        gradient: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(234,88,12,0.25))',
        icon: '🗺️',
        value: () => s?.tripsToday.total ?? '—',
        subs: () => [
          { label: 'Đang chạy', value: s?.tripsToday.inProgress ?? '—', dotColor: '#22c55e' }
        ]
      },
      {
        label: 'Đặt vé hôm nay',
        gradient: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(16,185,129,0.25))',
        icon: '🎟️',
        value: () => s?.bookingsToday.total ?? '—',
        subs: () => [
          { label: 'Đã xác nhận', value: s?.bookingsToday.confirmed ?? '—', dotColor: '#22c55e' }
        ]
      },
    ];
  }

  get recentTrips(): Trip[] {
    return this.stats()?.recentTrips ?? [];
  }

  async ngOnInit(): Promise<void> {
    await this.loadStats();
  }

  async loadStats(): Promise<void> {
    this.isLoading.set(true);
    this.hasError.set(false);
    try {
      const res = await this.dashboardService.getStats();
      this.stats.set(res.data);
    } catch {
      this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ─── Trip status helpers ───────────────────────────────────────
  statusLabel(status: TripStatus): string {
    const map: Record<TripStatus, string> = {
      scheduled:   'Đã lên lịch',
      'in-progress': 'Đang chạy',
      completed:   'Hoàn thành',
      cancelled:   'Đã hủy',
      delayed:     'Trễ chuyến',
    };
    return map[status] ?? status;
  }

  statusClass(status: TripStatus): string {
    const map: Record<TripStatus, string> = {
      scheduled:   'badge-scheduled',
      'in-progress': 'badge-inprogress',
      completed:   'badge-completed',
      cancelled:   'badge-cancelled',
      delayed:     'badge-delayed',
    };
    return map[status] ?? '';
  }

  trackByTrip(_: number, t: Trip): string {
    return t._id;
  }
}
