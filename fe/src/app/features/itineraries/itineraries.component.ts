import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ItineraryService } from '../../core/services/itinerary.service';
import { SeatService } from '../../core/services/seat.service';
import { TripService } from '../../core/services/trip.service';
import {
  Itinerary,
  ItineraryConnection,
  ItineraryStatus,
} from '../../core/models/itinerary.model';
import { BookingPassenger } from '../../core/models/booking.model';
import { Seat } from '../../core/models/seat.model';
import { Trip } from '../../core/models/trip.model';
import { ActionMenuComponent, MenuAction } from '../../shared/components/action-menu/action-menu.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { AddButtonComponent } from '../../shared/components/add-button/add-button.component';

// Must match MIN_TRANSFER_MINUTES on the backend (default 30)
const MIN_TRANSFER_MINUTES = 30;
const MINUTE_MS = 60 * 1000;

interface LegForm {
  tripId: string;
  seatId: string;
  fare?: number;
  seats: Seat[];
}

const emptyLeg = (): LegForm => ({ tripId: '', seatId: '', fare: undefined, seats: [] });

@Component({
  selector: 'app-itineraries',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ActionMenuComponent, SearchInputComponent, AddButtonComponent,
  ],
  templateUrl: './itineraries.component.html',
  styleUrls: ['../bookings/bookings.component.css', './itineraries.component.css'],
})
export class ItinerariesComponent implements OnInit {
  private itineraryService = inject(ItineraryService);
  private seatService      = inject(SeatService);
  private tripService      = inject(TripService);
  private toastr           = inject(ToastrService);

  // ─── Data ──────────────────────────────────────────────────────
  itineraries  = signal<Itinerary[]>([]);
  trips        = signal<Trip[]>([]);
  isLoading    = signal(false);
  isLoadingDetail = signal(false);
  isSubmitting = signal(false);
  isActioning  = signal(false);

  // ─── Pagination ────────────────────────────────────────────────
  currentPage = signal(1);
  totalPages  = signal(1);
  total       = signal(0);
  readonly limit = 10;

  // ─── Filters ───────────────────────────────────────────────────
  searchQuery  = signal('');
  statusFilter = signal('');

  // ─── Modals ────────────────────────────────────────────────────
  createOpen = signal(false);
  viewOpen   = signal(false);
  selected   = signal<Itinerary | null>(null);

  cancelDialogOpen   = signal(false);
  cancelReason       = signal('');
  itineraryToCancel  = signal<Itinerary | null>(null);

  // ─── Create form ───────────────────────────────────────────────
  passenger = signal<BookingPassenger>({ name: '', phone: '', email: '', idNumber: '' });
  legs      = signal<LegForm[]>([emptyLeg(), emptyLeg()]);

  // ─── Computed ──────────────────────────────────────────────────
  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  private tripMap = computed(() => new Map(this.trips().map(t => [t._id, t])));

  estimatedTotal = computed(() =>
    this.legs().reduce((sum, leg) => {
      const fare = leg.fare ?? this.tripMap().get(leg.tripId)?.fare ?? 0;
      return sum + fare;
    }, 0)
  );

  readonly statuses: { value: ItineraryStatus; label: string }[] = [
    { value: 'pending',   label: 'Chờ xác nhận' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  readonly minTransferMinutes = MIN_TRANSFER_MINUTES;

  // ─── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadItineraries();
    this.loadTrips();
  }

  // ─── Data Loading ──────────────────────────────────────────────
  async loadItineraries(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.itineraryService.getAll({
        page: this.currentPage(),
        limit: this.limit,
        search: this.searchQuery() || undefined,
        status: this.statusFilter() || undefined,
      });
      this.itineraries.set(res.data);
      this.totalPages.set(res.pagination.totalPages);
      this.total.set(res.total);
    } catch {
      this.toastr.error('Không thể tải danh sách hành trình', 'Lỗi');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadTrips(): Promise<void> {
    try {
      const res = await this.tripService.getAll({ limit: 200, status: 'scheduled', sort: 'scheduledDeparture' });
      this.trips.set(res.data);
    } catch {
      this.toastr.warning('Không thể tải danh sách chuyến đi', 'Cảnh báo');
    }
  }

  // ─── Filter handlers ───────────────────────────────────────────
  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    this.loadItineraries();
  }

  onStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadItineraries();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadItineraries();
  }

  // ─── Create modal ──────────────────────────────────────────────
  openCreateModal(): void {
    this.passenger.set({ name: '', phone: '', email: '', idNumber: '' });
    this.legs.set([emptyLeg(), emptyLeg()]);
    this.createOpen.set(true);
  }

  closeCreateModal(): void {
    this.createOpen.set(false);
  }

  updatePassengerField(field: keyof BookingPassenger, value: string): void {
    this.passenger.update(p => ({ ...p, [field]: value }));
  }

  addLeg(): void {
    this.legs.update(legs => [...legs, emptyLeg()]);
  }

  removeLeg(index: number): void {
    // Later legs were chosen to connect with this one, so reset them
    this.legs.update(legs => [
      ...legs.slice(0, index),
      ...legs.slice(index + 1).map(() => emptyLeg()),
    ]);
  }

  /** Trips that can follow the previous leg: same transfer point, enough transfer time */
  tripsForLeg(index: number): Trip[] {
    const scheduled = this.trips();
    if (index === 0) return scheduled;

    const prevTrip = this.tripMap().get(this.legs()[index - 1].tripId);
    if (!prevTrip) return [];

    const earliestDeparture = new Date(prevTrip.scheduledArrival).getTime() + MIN_TRANSFER_MINUTES * MINUTE_MS;
    return scheduled.filter(t =>
      this.sameLocation(t.route.origin, prevTrip.route.destination) &&
      new Date(t.scheduledDeparture).getTime() >= earliestDeparture
    );
  }

  async onLegTripSelect(index: number, tripId: string): Promise<void> {
    // Changing a leg invalidates every leg after it
    this.legs.update(legs => legs.map((leg, i) => {
      if (i === index) return { ...emptyLeg(), tripId };
      if (i > index) return emptyLeg();
      return leg;
    }));
    if (!tripId) return;

    try {
      const res = await this.seatService.getSeatMap(tripId, 'available');
      this.legs.update(legs => legs.map((leg, i) =>
        i === index && leg.tripId === tripId ? { ...leg, seats: res.data } : leg
      ));
    } catch {
      this.toastr.warning(`Không thể tải ghế cho chặng ${index + 1}`, 'Cảnh báo');
    }
  }

  selectSeat(index: number, seatId: string): void {
    this.legs.update(legs => legs.map((leg, i) => i === index ? { ...leg, seatId } : leg));
  }

  updateLegFare(index: number, value: string): void {
    const fare = value ? +value : undefined;
    this.legs.update(legs => legs.map((leg, i) => i === index ? { ...leg, fare } : leg));
  }

  /** Transfer description shown between leg (index - 1) and leg index */
  transferInfo(index: number): string | null {
    const prevTrip = this.tripMap().get(this.legs()[index - 1].tripId);
    const nextTrip = this.tripMap().get(this.legs()[index].tripId);
    if (!prevTrip || !nextTrip) return null;
    const minutes = Math.round(
      (new Date(nextTrip.scheduledDeparture).getTime() - new Date(prevTrip.scheduledArrival).getTime()) / MINUTE_MS
    );
    return `Chuyển xe tại ${prevTrip.route.destination} · ${this.formatDuration(minutes)}`;
  }

  async onSubmit(): Promise<void> {
    const p = this.passenger();
    const legs = this.legs();
    if (!p.name || !p.phone) {
      this.toastr.warning('Vui lòng nhập họ tên và số điện thoại', 'Thiếu thông tin');
      return;
    }
    const missing = legs.findIndex(l => !l.tripId || !l.seatId);
    if (missing !== -1) {
      this.toastr.warning(`Chặng ${missing + 1} chưa chọn chuyến hoặc ghế`, 'Thiếu thông tin');
      return;
    }

    this.isSubmitting.set(true);
    try {
      await this.itineraryService.create({
        passenger: {
          name: p.name,
          phone: p.phone,
          email: p.email || undefined,
          idNumber: p.idNumber || undefined,
        },
        legs: legs.map(l => ({ tripId: l.tripId, seatId: l.seatId, fare: l.fare })),
      });
      this.toastr.success('Đặt hành trình thành công', 'Thành công');
      this.closeCreateModal();
      this.currentPage.set(1);
      await this.loadItineraries();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? err?.message ?? 'Không thể đặt hành trình', 'Lỗi');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ─── View modal ────────────────────────────────────────────────
  async openViewModal(itinerary: Itinerary): Promise<void> {
    this.selected.set(itinerary);
    this.viewOpen.set(true);
    this.isLoadingDetail.set(true);
    try {
      this.selected.set(await this.itineraryService.getById(itinerary._id));
    } catch {
      this.toastr.warning('Không thể tải chi tiết đầy đủ', 'Cảnh báo');
    } finally {
      this.isLoadingDetail.set(false);
    }
  }

  closeViewModal(): void {
    this.viewOpen.set(false);
    this.selected.set(null);
  }

  connectionAfter(itinerary: Itinerary, legIndex: number): ItineraryConnection | undefined {
    return itinerary.connections?.find(c => c.fromLeg === legIndex + 1);
  }

  // ─── Confirm / Cancel ──────────────────────────────────────────
  async confirmItinerary(itinerary: Itinerary): Promise<void> {
    this.isActioning.set(true);
    try {
      await this.itineraryService.confirm(itinerary._id);
      this.toastr.success('Đã xác nhận toàn bộ hành trình', 'Thành công');
      await this.loadItineraries();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? err?.message ?? 'Không thể xác nhận', 'Lỗi');
    } finally {
      this.isActioning.set(false);
    }
  }

  openCancelDialog(itinerary: Itinerary): void {
    this.itineraryToCancel.set(itinerary);
    this.cancelReason.set('');
    this.cancelDialogOpen.set(true);
  }

  closeCancelDialog(): void {
    this.cancelDialogOpen.set(false);
    this.itineraryToCancel.set(null);
  }

  async submitCancel(): Promise<void> {
    const itinerary = this.itineraryToCancel();
    if (!itinerary) return;
    this.isActioning.set(true);
    try {
      await this.itineraryService.cancel(itinerary._id, this.cancelReason() || undefined);
      this.toastr.success('Đã hủy hành trình', 'Thành công');
      this.closeCancelDialog();
      await this.loadItineraries();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? err?.message ?? 'Không thể hủy hành trình', 'Lỗi');
    } finally {
      this.isActioning.set(false);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────
  getStatusLabel(status: ItineraryStatus): string {
    return this.statuses.find(s => s.value === status)?.label ?? status;
  }

  canConfirm(i: Itinerary): boolean { return i.status === 'pending'; }
  canCancel(i: Itinerary): boolean  { return i.status !== 'cancelled'; }

  /** "Hà Nội → Hải Phòng → Quảng Ninh" */
  routePath(itinerary: Itinerary): string {
    const routes = itinerary.legs.map(l => l.trip?.route).filter(r => !!r);
    if (routes.length === 0) return '—';
    return [routes[0]!.origin, ...routes.map(r => r!.destination)].join(' → ');
  }

  tripOptionLabel(t: Trip): string {
    return `${t.route.code} · ${t.route.origin} → ${t.route.destination} · ${this.formatDatetime(t.scheduledDeparture)}`;
  }

  formatDatetime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} phút`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} giờ ${m} phút` : `${h} giờ`;
  }

  private sameLocation(a?: string, b?: string): boolean {
    return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
  }

  // ─── Action menu ───────────────────────────────────────────────
  readonly EYE      = ['M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'];
  readonly CHECK    = ['M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'];
  readonly NOSYMBOL = ['M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'];

  getActions(i: Itinerary): MenuAction[] {
    const all: MenuAction[] = [
      { label: 'Xem chi tiết',     iconPaths: this.EYE,      action: () => this.openViewModal(i) },
      { label: 'Xác nhận',         iconPaths: this.CHECK,    color: 'success', disabled: !this.canConfirm(i), action: () => this.confirmItinerary(i) },
      { label: 'Hủy hành trình',   iconPaths: this.NOSYMBOL, color: 'danger',  disabled: !this.canCancel(i),  action: () => this.openCancelDialog(i) },
    ];
    return all.filter(a => !a.disabled);
  }
}
