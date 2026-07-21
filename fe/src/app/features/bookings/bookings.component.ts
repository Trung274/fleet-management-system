import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BookingService } from '../../core/services/booking.service';
import { SeatService } from '../../core/services/seat.service';
import { TripService } from '../../core/services/trip.service';
import {
  Booking,
  BookingStatus,
  BookingCreatePayload,
} from '../../core/models/booking.model';
import { Seat } from '../../core/models/seat.model';
import { Trip } from '../../core/models/trip.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActionMenuComponent, MenuAction } from '../../shared/components/action-menu/action-menu.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { AddButtonComponent } from '../../shared/components/add-button/add-button.component';

type ModalMode = 'create' | 'view';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ConfirmDialogComponent, ActionMenuComponent,
    SearchInputComponent, AddButtonComponent,
  ],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css',
})
export class BookingsComponent implements OnInit {
  private bookingService = inject(BookingService);
  private seatService    = inject(SeatService);
  private tripService    = inject(TripService);
  private toastr         = inject(ToastrService);

  // ─── Data ──────────────────────────────────────────────────────
  bookings    = signal<Booking[]>([]);
  trips       = signal<Trip[]>([]);
  seats       = signal<Seat[]>([]);
  isLoading   = signal(false);
  isLoadingDetail = signal(false); // loading khi mở view modal
  isSubmitting = signal(false);
  isActioning  = signal(false);
  isDeleting   = signal<string | null>(null);

  // ─── Pagination ────────────────────────────────────────────────
  currentPage = signal(1);
  totalPages  = signal(1);
  total       = signal(0);
  readonly limit = 10;

  // ─── Filters ───────────────────────────────────────────────────
  searchQuery  = signal('');
  statusFilter = signal('');
  tripFilter   = signal('');

  // ─── Modal ─────────────────────────────────────────────────────
  modalOpen    = signal(false);
  modalMode    = signal<ModalMode>('create');
  selectedBooking = signal<Booking | null>(null);

  // Delete confirm
  deleteConfirmOpen = signal(false);
  bookingToDelete   = signal<Booking | null>(null);

  // Cancel dialog
  cancelDialogOpen  = signal(false);
  cancelReason      = signal('');
  bookingToCancel   = signal<Booking | null>(null);

  // Form
  form = signal<BookingCreatePayload>({
    tripId: '', seatId: '',
    passenger: { name: '', phone: '', email: '', idNumber: '' },
    fare: undefined,
  });

  // ─── Computed ──────────────────────────────────────────────────
  isViewMode  = computed(() => this.modalMode() === 'view');
  modalTitle  = computed(() =>
    this.modalMode() === 'create' ? 'Đặt Vé Mới' : 'Chi Tiết Đặt Vé'
  );
  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  readonly bookingStatuses: { value: BookingStatus; label: string }[] = [
    { value: 'pending',   label: 'Chờ xác nhận' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  // ─── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadBookings();
    this.loadTrips();
  }

  // ─── Data Loading ──────────────────────────────────────────────
  async loadBookings(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.bookingService.getAll({
        page: this.currentPage(),
        limit: this.limit,
        search: this.searchQuery() || undefined,
        status: this.statusFilter() || undefined,
        tripId: this.tripFilter() || undefined,
        sort: '-bookedAt',
      });
      this.bookings.set(res.data);
      this.totalPages.set(res.pagination.totalPages);
      this.total.set(res.total);
    } catch {
      this.toastr.error('Không thể tải danh sách đặt vé', 'Lỗi');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadTrips(): Promise<void> {
    try {
      const res = await this.tripService.getAll({ limit: 200, sort: '-scheduledDeparture' });
      this.trips.set(res.data);
    } catch {
      this.toastr.warning('Không thể tải danh sách chuyến đi', 'Cảnh báo');
    }
  }

  async loadSeatsForTrip(tripId: string): Promise<void> {
    if (!tripId) { this.seats.set([]); return; }
    try {
      const res = await this.seatService.getSeatMap(tripId, 'available');
      this.seats.set(res.data);
    } catch {
      this.seats.set([]);
      this.toastr.warning('Không thể tải danh sách ghế', 'Cảnh báo');
    }
  }

  // ─── Filter handlers ───────────────────────────────────────────
  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    this.loadBookings();
  }

  onStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadBookings();
  }

  onTripFilter(value: string): void {
    this.tripFilter.set(value);
    this.currentPage.set(1);
    this.loadBookings();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadBookings();
  }

  // ─── Modal ─────────────────────────────────────────────────────
  openCreateModal(): void {
    this.form.set({
      tripId: '', seatId: '',
      passenger: { name: '', phone: '', email: '', idNumber: '' },
      fare: undefined,
    });
    this.seats.set([]);
    this.modalMode.set('create');
    this.selectedBooking.set(null);
    this.modalOpen.set(true);
  }

  async openViewModal(booking: Booking): Promise<void> {
    // Mở modal ngay với data sẵn có, đồng thời fetch đầy đủ
    this.selectedBooking.set(booking);
    this.modalMode.set('view');
    this.modalOpen.set(true);
    this.isLoadingDetail.set(true);
    try {
      const full = await this.bookingService.getById(booking._id);
      this.selectedBooking.set(full);
    } catch {
      this.toastr.warning('Không thể tải chi tiết đầy đủ', 'Cảnh báo');
    } finally {
      this.isLoadingDetail.set(false);
    }
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedBooking.set(null);
  }

  // ─── Create ────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    const f = this.form();
    if (!f.tripId || !f.seatId || !f.passenger.name || !f.passenger.phone) {
      this.toastr.warning('Vui lòng điền đầy đủ thông tin bắt buộc', 'Thiếu thông tin');
      return;
    }
    this.isSubmitting.set(true);
    try {
      await this.bookingService.create({
        ...f,
        fare: f.fare ? Number(f.fare) : undefined,
        passenger: {
          name: f.passenger.name,
          phone: f.passenger.phone,
          email: f.passenger.email || undefined,
          idNumber: f.passenger.idNumber || undefined,
        },
      });
      this.toastr.success('Đặt vé thành công', 'Thành công');
      this.closeModal();
      this.currentPage.set(1);
      await this.loadBookings();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? err?.message ?? 'Không thể đặt vé', 'Lỗi');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ─── Confirm booking ───────────────────────────────────────────
  async confirmBooking(booking: Booking): Promise<void> {
    this.isActioning.set(true);
    try {
      await this.bookingService.confirm(booking._id);
      this.toastr.success('Xác nhận đặt vé thành công', 'Thành công');
      await this.loadBookings();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? err?.message ?? 'Không thể xác nhận', 'Lỗi');
    } finally {
      this.isActioning.set(false);
    }
  }

  // ─── Cancel booking ────────────────────────────────────────────
  openCancelDialog(booking: Booking): void {
    this.bookingToCancel.set(booking);
    this.cancelReason.set('');
    this.cancelDialogOpen.set(true);
  }

  closeCancelDialog(): void {
    this.cancelDialogOpen.set(false);
    this.bookingToCancel.set(null);
  }

  async submitCancel(): Promise<void> {
    const booking = this.bookingToCancel();
    if (!booking) return;
    this.isActioning.set(true);
    try {
      await this.bookingService.cancel(booking._id, { reason: this.cancelReason() || undefined });
      this.toastr.success('Đã hủy đặt vé', 'Thành công');
      this.closeCancelDialog();
      await this.loadBookings();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? err?.message ?? 'Không thể hủy đặt vé', 'Lỗi');
    } finally {
      this.isActioning.set(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────
  confirmDelete(booking: Booking): void {
    this.bookingToDelete.set(booking);
    this.deleteConfirmOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.bookingToDelete.set(null);
  }

  async executeDelete(): Promise<void> {
    const booking = this.bookingToDelete();
    if (!booking) return;
    this.isDeleting.set(booking._id);
    try {
      await this.bookingService.delete(booking._id);
      this.toastr.success('Đã xóa đặt vé', 'Thành công');
      this.cancelDelete();
      if (this.bookings().length === 1 && this.currentPage() > 1) {
        this.currentPage.update(p => p - 1);
      }
      await this.loadBookings();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? err?.message ?? 'Không thể xóa đặt vé', 'Lỗi');
    } finally {
      this.isDeleting.set(null);
    }
  }

  // ─── Status helpers ────────────────────────────────────────────
  getStatusLabel(status: BookingStatus): string {
    return this.bookingStatuses.find(s => s.value === status)?.label ?? status;
  }

  canConfirm(b: Booking): boolean  { return b.status === 'pending'; }
  canCancel(b: Booking): boolean   { return b.status !== 'cancelled'; }
  canDelete(b: Booking): boolean   { return b.status === 'cancelled'; }

  formatDatetime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ─── Form helpers ──────────────────────────────────────────────
  updatePassengerField(field: keyof BookingCreatePayload['passenger'], value: string): void {
    this.form.update(f => ({
      ...f,
      passenger: { ...f.passenger, [field]: value },
    }));
  }

  async onTripSelect(tripId: string): Promise<void> {
    this.form.update(f => ({ ...f, tripId, seatId: '' }));
    await this.loadSeatsForTrip(tripId);
  }

  // ─── Action menu ───────────────────────────────────────────────
  readonly EYE      = ['M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'];
  readonly CHECK    = ['M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'];
  readonly NOSYMBOL = ['M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'];
  readonly TRASH    = ['M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0'];

  getActions(b: Booking): MenuAction[] {
    const all: MenuAction[] = [
      { label: 'Xem chi tiết',  iconPaths: this.EYE,      action: () => this.openViewModal(b) },
      { label: 'Xác nhận',      iconPaths: this.CHECK,    color: 'success', disabled: !this.canConfirm(b), action: () => this.confirmBooking(b) },
      { label: 'Hủy đặt vé',   iconPaths: this.NOSYMBOL, color: 'danger',  disabled: !this.canCancel(b),  action: () => this.openCancelDialog(b) },
      { label: 'Xóa',          iconPaths: this.TRASH,    color: 'danger',  disabled: !this.canDelete(b),  action: () => this.confirmDelete(b) },
    ];
    return all.filter(a => !a.disabled);
  }
}
