import { Component, OnInit, OnDestroy, signal, inject, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardData, DashboardRevenueDay, DashboardScheduleItem } from '../../core/models/dashboard.model';
import { AppNotification } from '../../core/models/notification.model';
import { TripStatus } from '../../core/models/trip.model';

const REFRESH_MS = 2 * 60 * 1000;
const SOON_MINUTES = 60;
const MAX_ALERTS = 5;
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** How a trip on today's schedule should be shown */
type ScheduleState = 'running' | 'soon' | 'late' | 'upcoming' | 'done' | 'cancelled';

interface Trend {
  text: string;
  direction: 'up' | 'down' | 'flat';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private timer?: ReturnType<typeof setInterval>;

  isLoading = signal(true);
  hasError = signal(false);
  stats = signal<DashboardData | null>(null);
  /** Ticks every refresh so countdowns ("còn 45 phút") stay current */
  now = signal(new Date());
  todayDate = new Date();

  hasQuickActions = computed(() =>
    ['trips', 'bookings', 'vehicles', 'drivers'].some(res => this.authService.can(res, 'create')),
  );

  // ─── KPI tiles ─────────────────────────────────────────────────
  trips = computed(() => this.stats()?.trips);
  revenue = computed(() => this.stats()?.revenue);
  vehicles = computed(() => this.stats()?.vehicles);
  drivers = computed(() => this.stats()?.drivers);

  tripsTrend = computed<Trend | null>(() => {
    const t = this.trips();
    if (!t) return null;
    return this.diffTrend(t.today.total - t.yesterdayTotal, ' chuyến so với hôm qua');
  });

  revenueTrend = computed<Trend | null>(() => {
    const r = this.revenue();
    if (!r) return null;
    if (!r.yesterday.confirmed) return r.today.confirmed ? { text: 'Hôm qua chưa có doanh thu', direction: 'flat' } : null;
    const pct = Math.round(((r.today.confirmed - r.yesterday.confirmed) / r.yesterday.confirmed) * 100);
    return { text: `${pct > 0 ? '+' : ''}${pct}% so với hôm qua`, direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
  });

  occupancy = computed(() => {
    const s = this.stats()?.seats;
    if (!s || !s.today.total) return null;
    const pct = Math.round((s.today.taken / s.today.total) * 100);
    let trend: Trend | null = null;
    if (s.yesterday.total) {
      const diff = pct - Math.round((s.yesterday.taken / s.yesterday.total) * 100);
      trend = this.diffTrend(diff, ' điểm % so với hôm qua');
    }
    return { pct, taken: s.today.taken, total: s.today.total, trend };
  });

  // ─── Today's schedule ──────────────────────────────────────────
  schedule = computed(() =>
    (this.trips()?.schedule ?? []).map(t => ({ ...t, state: this.scheduleState(t), countdown: this.countdown(t) }))
  );

  // ─── Alerts (same feed as the header bell) ─────────────────────
  alerts = computed(() => this.notificationService.items().slice(0, MAX_ALERTS));
  alertCount = computed(() => this.notificationService.items().length);

  // ─── 7-day revenue chart ───────────────────────────────────────
  hoveredDay = signal<number | null>(null);
  revenueDays = computed(() => this.revenue()?.last7Days ?? []);
  /** Rounded-up axis max so gridlines land on readable values */
  revenueMax = computed(() => this.niceMax(Math.max(0, ...this.revenueDays().map(d => d.revenue))));
  weekTotals = computed(() => this.revenueDays().reduce(
    (acc, d) => ({ revenue: acc.revenue + d.revenue, tickets: acc.tickets + d.tickets }), { revenue: 0, tickets: 0 },
  ));
  topRouteMax = computed(() => Math.max(1, ...(this.revenue()?.topRoutes ?? []).map(r => r.tickets)));

  ngOnInit(): void {
    this.loadStats();
    this.notificationService.refresh();
    if (this.isBrowser) {
      this.timer = setInterval(() => this.loadStats(true), REFRESH_MS);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async loadStats(silent = false): Promise<void> {
    if (!silent) this.isLoading.set(true);
    this.hasError.set(false);
    try {
      const res = await this.dashboardService.getStats();
      this.stats.set(res.data);
      this.now.set(new Date());
    } catch {
      if (!silent) this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  openAlert(n: AppNotification): void {
    this.notificationService.markRead(n);
    this.router.navigate([n.link]);
  }

  // ─── Formatting ────────────────────────────────────────────────
  /** 4200000 → "4,2 tr" ; 45000 → "45k" */
  shortMoney(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.', ',')} tr`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(n);
  }

  time(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  dayLabel(d: DashboardRevenueDay): { weekday: string; date: string; isToday: boolean } {
    const [y, m, day] = d.date.split('-').map(Number);
    const date = new Date(y, m - 1, day);
    const today = this.now();
    return {
      weekday: WEEKDAYS[date.getDay()],
      date: `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
      isToday: date.toDateString() === today.toDateString(),
    };
  }

  barHeight(value: number): number {
    return this.revenueMax() ? (value / this.revenueMax()) * 100 : 0;
  }

  pct(part: number, total: number): number {
    return total ? (part / total) * 100 : 0;
  }

  statusLabel(item: { state: ScheduleState; status: TripStatus; delayDuration?: number }): string {
    switch (item.state) {
      case 'running':   return 'Đang chạy';
      case 'soon':      return 'Sắp khởi hành';
      case 'late':      return `Trễ ${item.delayDuration ?? ''}p`.trim();
      case 'done':      return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default:          return 'Đã lên lịch';
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────
  private scheduleState(t: DashboardScheduleItem): ScheduleState {
    if (t.status === 'in-progress') return 'running';
    if (t.status === 'completed') return 'done';
    if (t.status === 'cancelled') return 'cancelled';
    if (t.status === 'delayed') return 'late';
    const minutes = (new Date(t.scheduledDeparture).getTime() - this.now().getTime()) / 60000;
    return minutes >= 0 && minutes <= SOON_MINUTES ? 'soon' : 'upcoming';
  }

  private countdown(t: DashboardScheduleItem): string | null {
    if (t.status !== 'scheduled') return null;
    const minutes = Math.round((new Date(t.scheduledDeparture).getTime() - this.now().getTime()) / 60000);
    if (minutes < 0) return 'quá giờ khởi hành';
    if (minutes < 60) return `còn ${minutes} phút`;
    return null;
  }

  private diffTrend(diff: number, suffix: string): Trend {
    if (diff === 0) return { text: `Bằng hôm qua`, direction: 'flat' };
    return { text: `${diff > 0 ? '+' : ''}${diff}${suffix}`, direction: diff > 0 ? 'up' : 'down' };
  }

  /** 1, 2, 2.5 or 5 × a power of ten, at or above the max */
  private niceMax(max: number): number {
    if (max <= 0) return 0;
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    const step = [1, 2, 2.5, 5, 10].find(s => s * pow >= max)!;
    return step * pow;
  }
}
