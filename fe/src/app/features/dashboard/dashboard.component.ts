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
  desc: () => string;
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
  todayDate = new Date();

  // ─── Derived stat cards ────────────────────────────────────────
  get statCards(): StatCard[] {
    const s = this.stats();
    return [
      {
        label: 'Tổng số xe',
        gradient: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
        icon: 'vehicle',
        value: () => s?.vehicles.total ?? '—',
        desc: () => `${s?.vehicles.active ?? 0} xe đang hoạt động`
      },
      {
        label: 'Tổng tài xế',
        gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))',
        icon: 'driver',
        value: () => s?.drivers.total ?? '—',
        desc: () => `${s?.drivers.active ?? 0} tài xế đang làm việc`
      },
      {
        label: 'Chuyến hôm nay',
        gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.15))',
        icon: 'trip',
        value: () => s?.tripsToday.total ?? '—',
        desc: () => `${s?.tripsToday.inProgress ?? 0} chuyến đang chạy`
      },
      {
        label: 'Đặt vé hôm nay',
        gradient: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.15))',
        icon: 'booking',
        value: () => s?.bookingsToday.total ?? '—',
        desc: () => `${s?.bookingsToday.confirmed ?? 0} vé đã xác nhận`
      }
    ];
  }

  get recentTrips(): Trip[] {
    return this.stats()?.recentTrips ?? [];
  }

  // ─── Progress Percentage Getters ──────────────────────────────
  vehiclePercentActive(): number {
    const s = this.stats();
    if (!s || !s.vehicles.total) return 0;
    return (s.vehicles.active / s.vehicles.total) * 100;
  }

  vehiclePercentMaintenance(): number {
    const s = this.stats();
    if (!s || !s.vehicles.total) return 0;
    return (s.vehicles.maintenance / s.vehicles.total) * 100;
  }

  vehiclePercentOut(): number {
    const s = this.stats();
    if (!s || !s.vehicles.total) return 0;
    return (s.vehicles.outOfService / s.vehicles.total) * 100;
  }

  driverPercentActive(): number {
    const s = this.stats();
    if (!s || !s.drivers.total) return 0;
    return (s.drivers.active / s.drivers.total) * 100;
  }

  driverPercentInactive(): number {
    const s = this.stats();
    if (!s || !s.drivers.total) return 0;
    return (s.drivers.inactive / s.drivers.total) * 100;
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
