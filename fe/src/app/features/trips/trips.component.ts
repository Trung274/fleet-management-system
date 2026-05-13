import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TripService } from '../../core/services/trip.service';
import { RouteService } from '../../core/services/route.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { DriverService } from '../../core/services/driver.service';
import {
  Trip,
  TripStatus,
  TripCreatePayload,
} from '../../core/models/trip.model';
import { BusRoute } from '../../core/models/route.model';
import { Vehicle } from '../../core/models/vehicle.model';
import { Driver } from '../../core/models/driver.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActionMenuComponent, MenuAction } from '../../shared/components/action-menu/action-menu.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { AddButtonComponent } from '../../shared/components/add-button/add-button.component';

type ModalMode = 'create' | 'edit' | 'view';
type ActionDialog = 'cancel' | 'delay' | 'complete' | null;

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, ActionMenuComponent, SearchInputComponent, AddButtonComponent],
  templateUrl: './trips.component.html',
  styleUrl: './trips.component.css',
})
export class TripsComponent implements OnInit {
  private tripService    = inject(TripService);
  private routeService   = inject(RouteService);
  private vehicleService = inject(VehicleService);
  private driverService  = inject(DriverService);
  private toastr         = inject(ToastrService);

  // ─── Data ──────────────────────────────────────────────────────
  trips      = signal<Trip[]>([]);
  routes     = signal<BusRoute[]>([]);
  vehicles   = signal<Vehicle[]>([]);
  drivers    = signal<Driver[]>([]);
  isLoading  = signal(false);
  isLoadingDetail = signal(false);
  isSubmitting = signal(false);
  isActioning  = signal(false);
  isDeleting   = signal<string | null>(null);

  // ─── Pagination ────────────────────────────────────────────────
  currentPage = signal(1);
  totalPages  = signal(1);
  total       = signal(0);
  readonly limit = 10;

  // ─── Filters ───────────────────────────────────────────────────
  statusFilter = signal('');
  dateFilter   = signal('');
  searchQuery  = signal('');

  // ─── Computed: client-side search filter ───────────────────────
  filteredTrips = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.trips();
    return this.trips().filter(t =>
      t.route.name.toLowerCase().includes(q) ||
      t.route.code.toLowerCase().includes(q) ||
      t.vehicle.registrationNumber.toLowerCase().includes(q) ||
      `${t.driver.firstName} ${t.driver.lastName}`.toLowerCase().includes(q),
    );
  });


  // ─── Modal ─────────────────────────────────────────────────────
  modalOpen      = signal(false);
  modalMode      = signal<ModalMode>('create');
  selectedTrip   = signal<Trip | null>(null);

  // Delete confirm
  deleteConfirmOpen = signal(false);
  tripToDelete      = signal<Trip | null>(null);

  // Action dialogs (cancel / delay / complete)
  actionDialog        = signal<ActionDialog>(null);
  cancelReason        = signal('');
  delayReason         = signal('');
  delayDuration       = signal(0);
  completePassengers  = signal<number | null>(null);
  completeNotes       = signal('');

  // ─── Form ──────────────────────────────────────────────────────
  form = signal<TripCreatePayload>({
    route: '', vehicle: '', driver: '',
    scheduledDeparture: '', scheduledArrival: '',
    fare: undefined, notes: '',
  });

  // ─── Computed ──────────────────────────────────────────────────
  isViewMode = computed(() => this.modalMode() === 'view');
  modalTitle = computed(() => {
    switch (this.modalMode()) {
      case 'create': return 'Lên Lịch Chuyến Đi';
      case 'edit':   return 'Chỉnh Sửa Chuyến Đi';
      case 'view':   return 'Chi Tiết Chuyến Đi';
    }
  });

  readonly tripStatuses: { value: TripStatus; label: string }[] = [
    { value: 'scheduled',    label: 'Đã lên lịch' },
    { value: 'in-progress',  label: 'Đang chạy' },
    { value: 'completed',    label: 'Hoàn thành' },
    { value: 'cancelled',    label: 'Đã hủy' },
    { value: 'delayed',      label: 'Bị trễ' },
  ];

  readonly pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  // ─── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadTrips();
    this.loadDropdowns();
  }

  // ─── Data Loading ──────────────────────────────────────────────
  async loadTrips(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.tripService.getAll({
        page: this.currentPage(),
        limit: this.limit,
        status: this.statusFilter() || undefined,
        date: this.dateFilter() || undefined,
        sort: '-scheduledDeparture',
      });
      this.trips.set(res.data);
      this.totalPages.set(res.totalPages);
      this.total.set(res.total);
    } catch {
      this.toastr.error('Không thể tải danh sách chuyến đi', 'Lỗi');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const [r, v, d] = await Promise.all([
        this.routeService.getAll({ limit: 200, status: 'active' }),
        this.vehicleService.getAll({ limit: 200, status: 'active' }),
        this.driverService.getAll({ limit: 200, status: 'active' }),
      ]);
      this.routes.set(r.data);
      this.vehicles.set(v.data);
      this.drivers.set(d.data);
    } catch {
      this.toastr.warning('Không thể tải danh sách dropdown', 'Cảnh báo');
    }
  }

  // ─── Filter handlers ───────────────────────────────────────────
  onStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadTrips();
  }

  onDateFilter(value: string): void {
    this.dateFilter.set(value);
    this.currentPage.set(1);
    this.loadTrips();
  }

  onSearch(value: string): void {
    this.searchQuery.set(value); // client-side filter — no API call needed
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadTrips();
  }

  // ─── Modal ─────────────────────────────────────────────────────
  openCreateModal(): void {
    this.form.set({
      route: '', vehicle: '', driver: '',
      scheduledDeparture: '', scheduledArrival: '',
      fare: undefined, notes: '',
    });
    this.modalMode.set('create');
    this.selectedTrip.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(trip: Trip): void {
    this.selectedTrip.set(trip);
    this.form.set({
      route: trip.route._id,
      vehicle: trip.vehicle._id,
      driver: trip.driver._id,
      scheduledDeparture: this.toLocalDatetime(trip.scheduledDeparture),
      scheduledArrival: this.toLocalDatetime(trip.scheduledArrival),
      fare: trip.fare,
      notes: trip.notes ?? '',
    });
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  async openViewModal(trip: Trip): Promise<void> {
    this.selectedTrip.set(trip);
    this.modalMode.set('view');
    this.modalOpen.set(true);
    this.isLoadingDetail.set(true);
    try {
      const res = await this.tripService.getById(trip._id);
      this.selectedTrip.set(res.data);
    } catch {
      this.toastr.warning('Không thể tải chi tiết đầy đủ', 'Cảnh báo');
    } finally {
      this.isLoadingDetail.set(false);
    }
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedTrip.set(null);
  }

  // ─── CRUD ──────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.isViewMode()) return;
    this.isSubmitting.set(true);
    const f = this.form();
    const payload = {
      ...f,
      fare: f.fare ? Number(f.fare) : undefined,
    };

    try {
      if (this.modalMode() === 'create') {
        await this.tripService.create(payload);
        this.toastr.success('Lên lịch chuyến đi thành công', 'Thành công');
      } else {
        await this.tripService.update(this.selectedTrip()!._id, payload);
        this.toastr.success('Cập nhật chuyến đi thành công', 'Thành công');
      }
      this.closeModal();
      this.currentPage.set(1);
      await this.loadTrips();
    } catch (err: any) {
      this.toastr.error(err?.error?.message ?? 'Có lỗi xảy ra', 'Lỗi');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────
  confirmDelete(trip: Trip): void {
    this.tripToDelete.set(trip);
    this.deleteConfirmOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.tripToDelete.set(null);
  }

  async executeDelete(): Promise<void> {
    const trip = this.tripToDelete();
    if (!trip) return;
    this.isDeleting.set(trip._id);
    try {
      await this.tripService.delete(trip._id);
      this.toastr.success('Đã xóa chuyến đi', 'Thành công');
      this.cancelDelete();
      if (this.trips().length === 1 && this.currentPage() > 1) {
        this.currentPage.update(p => p - 1);
      }
      await this.loadTrips();
    } catch (err: any) {
      this.toastr.error(err?.error?.message ?? 'Không thể xóa chuyến đi', 'Lỗi');
    } finally {
      this.isDeleting.set(null);
    }
  }

  // ─── Lifecycle Actions ─────────────────────────────────────────
  async startTrip(trip: Trip): Promise<void> {
    this.isActioning.set(true);
    try {
      await this.tripService.start(trip._id);
      this.toastr.success(`Chuyến "${trip.route.name}" đã xuất phát`, 'Thành công');
      await this.loadTrips();
    } catch (err: any) {
      this.toastr.error(err?.error?.message ?? 'Không thể khởi hành chuyến đi', 'Lỗi');
    } finally {
      this.isActioning.set(false);
    }
  }

  openActionDialog(trip: Trip, action: ActionDialog): void {
    this.selectedTrip.set(trip);
    this.cancelReason.set('');
    this.delayReason.set('');
    this.delayDuration.set(0);
    this.completePassengers.set(null);
    this.completeNotes.set('');
    this.actionDialog.set(action);
  }

  closeActionDialog(): void {
    this.actionDialog.set(null);
    this.selectedTrip.set(null);
  }

  async submitActionDialog(): Promise<void> {
    const trip = this.selectedTrip();
    if (!trip) return;
    const action = this.actionDialog();
    this.isActioning.set(true);

    try {
      switch (action) {
        case 'cancel':
          if (!this.cancelReason().trim()) {
            this.toastr.warning('Vui lòng nhập lý do hủy', 'Thiếu thông tin');
            return;
          }
          await this.tripService.cancel(trip._id, { cancellationReason: this.cancelReason() });
          this.toastr.success('Đã hủy chuyến đi', 'Thành công');
          break;

        case 'delay':
          if (!this.delayReason().trim() || this.delayDuration() <= 0) {
            this.toastr.warning('Vui lòng nhập lý do và thời gian trễ', 'Thiếu thông tin');
            return;
          }
          await this.tripService.delay(trip._id, {
            delayReason: this.delayReason(),
            delayDuration: this.delayDuration(),
          });
          this.toastr.success('Đã đánh dấu trễ chuyến', 'Thành công');
          break;

        case 'complete':
          await this.tripService.complete(trip._id, {
            passengerCount: this.completePassengers() ?? undefined,
            notes: this.completeNotes() || undefined,
          });
          this.toastr.success('Chuyến đi đã hoàn thành', 'Thành công');
          break;
      }
      this.closeActionDialog();
      await this.loadTrips();
    } catch (err: any) {
      this.toastr.error(err?.error?.message ?? 'Thao tác thất bại', 'Lỗi');
    } finally {
      this.isActioning.set(false);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────
  getStatusLabel(status: TripStatus): string {
    return this.tripStatuses.find(s => s.value === status)?.label ?? status;
  }

  formatDatetime(iso: string | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  canStart(trip: Trip): boolean {
    return trip.status === 'scheduled' || trip.status === 'delayed';
  }
  canComplete(trip: Trip): boolean { return trip.status === 'in-progress'; }
  canCancel(trip: Trip): boolean {
    return ['scheduled', 'delayed', 'in-progress'].includes(trip.status);
  }
  canDelay(trip: Trip): boolean { return trip.status === 'scheduled'; }
  canDelete(trip: Trip): boolean { return trip.status === 'scheduled'; }
  canEdit(trip: Trip): boolean {
    return !['completed', 'cancelled'].includes(trip.status);
  }

  /** Convert ISO → `datetime-local` value (strips Z, keeps local offset) */
  private toLocalDatetime(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  updateFormField(field: keyof TripCreatePayload, value: unknown): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  get actionDialogTitle(): string {
    switch (this.actionDialog()) {
      case 'cancel':   return 'Hủy Chuyến Đi';
      case 'delay':    return 'Đánh Dấu Trễ';
      case 'complete': return 'Hoàn Thành Chuyến Đi';
      default:         return '';
    }
  }

  readonly EYE      = ['M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'];
  readonly EDIT     = ['M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z'];
  readonly TRASH    = ['M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0'];
  readonly PLAY     = ['M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z'];
  readonly CHECK    = ['M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'];
  readonly CLOCK    = ['M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z'];
  readonly NOSYMBOL = ['M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'];

  getActions(t: Trip): MenuAction[] {
    const all: MenuAction[] = [
      { label: 'Xem chi tiết', iconPaths: this.EYE,      action: () => this.openViewModal(t) },
      { label: 'Chỉnh sửa',   iconPaths: this.EDIT,     color: 'warning', disabled: !this.canEdit(t),     action: () => this.openEditModal(t) },
      { label: 'Xuất phát',   iconPaths: this.PLAY,     color: 'success', disabled: !this.canStart(t),    action: () => this.startTrip(t) },
      { label: 'Hoàn thành',  iconPaths: this.CHECK,    color: 'success', disabled: !this.canComplete(t), action: () => this.openActionDialog(t, 'complete') },
      { label: 'Đánh dấu trễ',iconPaths: this.CLOCK,    color: 'info',    disabled: !this.canDelay(t),    action: () => this.openActionDialog(t, 'delay') },
      { label: 'Hủy chuyến',  iconPaths: this.NOSYMBOL, color: 'danger',  disabled: !this.canCancel(t),   action: () => this.openActionDialog(t, 'cancel') },
      { label: 'Xóa',         iconPaths: this.TRASH,    color: 'danger',  disabled: !this.canDelete(t),   action: () => this.confirmDelete(t) },
    ];
    return all.filter(a => !a.disabled);
  }
}
