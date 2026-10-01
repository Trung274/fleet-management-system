import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  ConflictingTrip,
  MaintenanceRecord,
  MaintenanceStatus,
  MaintenanceType,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from '../../core/models/maintenance.model';
import { Vehicle } from '../../core/models/vehicle.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActionMenuComponent, MenuAction } from '../../shared/components/action-menu/action-menu.component';
import { AddButtonComponent } from '../../shared/components/add-button/add-button.component';

type Tab = 'upcoming' | 'done' | 'all';
const TAB_STATUSES: Record<Tab, string> = {
  upcoming: 'scheduled,in-progress',
  done: 'completed,cancelled',
  all: '',
};

interface MaintenanceForm {
  vehicle: string;
  type: MaintenanceType;
  scheduledStart: string; // datetime-local value
  scheduledEnd: string;
  garage: string;
  cost: string;
  notes: string;
}

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent, ActionMenuComponent, AddButtonComponent],
  templateUrl: './maintenance.component.html',
  styleUrls: ['../bookings/bookings.component.css', './maintenance.component.css'],
})
export class MaintenanceComponent implements OnInit {
  private maintenanceService = inject(MaintenanceService);
  private vehicleService     = inject(VehicleService);
  private notifications      = inject(NotificationService);
  private auth               = inject(AuthService);
  private toastr             = inject(ToastrService);

  readonly allowCreate = computed(() => this.auth.can('maintenance', 'create'));
  readonly allowUpdate = computed(() => this.auth.can('maintenance', 'update'));
  readonly allowDelete = computed(() => this.auth.can('maintenance', 'delete'));

  // ─── Data ──────────────────────────────────────────────────────
  records   = signal<MaintenanceRecord[]>([]);
  vehicles  = signal<Vehicle[]>([]);
  isLoading = signal(false);

  tab           = signal<Tab>('upcoming');
  vehicleFilter = signal('');
  typeFilter    = signal('');
  currentPage   = signal(1);
  totalPages    = signal(1);
  total         = signal(0);
  readonly limit = 10;
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  readonly types: MaintenanceType[] = ['periodic', 'repair', 'inspection'];
  readonly typeLabels = MAINTENANCE_TYPE_LABELS;
  readonly statusLabels = MAINTENANCE_STATUS_LABELS;

  // Vehicles that can be scheduled (retired ones cannot)
  schedulableVehicles = computed(() => this.vehicles().filter(v => v.status !== 'retired'));

  // ─── Create / edit modal ───────────────────────────────────────
  modalOpen    = signal(false);
  editing      = signal<MaintenanceRecord | null>(null);
  isSubmitting = signal(false);
  form         = signal<MaintenanceForm>(this.emptyForm());
  /** Trips returned by a 409 — they must move to another vehicle first */
  conflicts    = signal<ConflictingTrip[]>([]);

  formError = computed(() => {
    const f = this.form();
    if (!f.vehicle) return 'Chọn xe';
    if (!f.scheduledStart || !f.scheduledEnd) return 'Nhập thời gian bắt đầu và kết thúc';
    if (new Date(f.scheduledEnd) <= new Date(f.scheduledStart)) return 'Thời gian kết thúc phải sau thời gian bắt đầu';
    if (f.cost && +f.cost < 0) return 'Chi phí không được âm';
    return null;
  });

  // ─── Complete / cancel / delete dialogs ────────────────────────
  completing        = signal<MaintenanceRecord | null>(null);
  completeExpiry    = signal('');
  completeCost      = signal('');
  cancelling        = signal<MaintenanceRecord | null>(null);
  cancelReason      = signal('');
  deleting          = signal<MaintenanceRecord | null>(null);
  isActioning       = signal(false);

  ngOnInit(): void {
    this.loadRecords();
    this.loadVehicles();
  }

  async loadRecords(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.maintenanceService.getAll({
        page: this.currentPage(),
        limit: this.limit,
        status: TAB_STATUSES[this.tab()] || undefined,
        vehicle: this.vehicleFilter() || undefined,
        type: this.typeFilter() || undefined,
      });
      this.records.set(res.data);
      this.totalPages.set(res.totalPages || 1);
      this.total.set(res.total);
    } catch {
      this.toastr.error('Không thể tải lịch bảo dưỡng', 'Lỗi');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadVehicles(): Promise<void> {
    if (!this.auth.can('vehicles', 'read')) return;
    try {
      const res = await this.vehicleService.getAll({ limit: 200 });
      this.vehicles.set(res.data);
    } catch {
      this.toastr.warning('Không thể tải danh sách xe', 'Cảnh báo');
    }
  }

  // ─── Filters ───────────────────────────────────────────────────
  setTab(tab: Tab): void { this.tab.set(tab); this.currentPage.set(1); this.loadRecords(); }
  onVehicleFilter(v: string): void { this.vehicleFilter.set(v); this.currentPage.set(1); this.loadRecords(); }
  onTypeFilter(v: string): void { this.typeFilter.set(v); this.currentPage.set(1); this.loadRecords(); }
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadRecords();
  }

  // ─── Create / edit ─────────────────────────────────────────────
  openCreate(): void {
    this.form.set(this.emptyForm());
    this.editing.set(null);
    this.conflicts.set([]);
    this.modalOpen.set(true);
  }

  openEdit(r: MaintenanceRecord): void {
    this.form.set({
      vehicle: r.vehicle._id,
      type: r.type,
      scheduledStart: this.toLocalInput(r.scheduledStart),
      scheduledEnd: this.toLocalInput(r.scheduledEnd),
      garage: r.garage ?? '',
      cost: r.cost != null ? String(r.cost) : '',
      notes: r.notes ?? '',
    });
    this.editing.set(r);
    this.conflicts.set([]);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editing.set(null);
    this.conflicts.set([]);
  }

  updateField(field: keyof MaintenanceForm, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
    // Times or vehicle changed → old conflict list no longer applies
    if (field === 'vehicle' || field === 'scheduledStart' || field === 'scheduledEnd') this.conflicts.set([]);
  }

  async onSubmit(): Promise<void> {
    if (this.formError()) return;
    const f = this.form();
    const payload = {
      type: f.type,
      scheduledStart: new Date(f.scheduledStart).toISOString(),
      scheduledEnd: new Date(f.scheduledEnd).toISOString(),
      garage: f.garage.trim() || undefined,
      cost: f.cost ? +f.cost : undefined,
      notes: f.notes.trim() || undefined,
    };
    this.isSubmitting.set(true);
    this.conflicts.set([]);
    try {
      const editing = this.editing();
      if (editing) {
        await this.maintenanceService.update(editing._id, payload);
        this.toastr.success('Đã cập nhật lịch bảo dưỡng', 'Thành công');
      } else {
        await this.maintenanceService.create({ ...payload, vehicle: f.vehicle });
        this.toastr.success('Đã lên lịch bảo dưỡng', 'Thành công');
      }
      this.closeModal();
      await this.reload();
    } catch (err: any) {
      if (err?.status === 409 && err?.error?.data?.conflictingTrips) {
        this.conflicts.set(err.error.data.conflictingTrips);
      } else {
        this.toastr.error(err?.error?.error ?? 'Không thể lưu lịch bảo dưỡng', 'Lỗi');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ─── Start / complete / cancel / delete ────────────────────────
  async start(r: MaintenanceRecord): Promise<void> {
    try {
      await this.maintenanceService.start(r._id);
      this.toastr.success(`Xe ${r.vehicle.registrationNumber} đã vào xưởng`, 'Thành công');
      await this.reload();
    } catch (err: any) {
      const trips = err?.error?.data?.conflictingTrips?.length;
      this.toastr.error(
        trips ? `Xe còn ${trips} chuyến trong thời gian này — đổi xe cho các chuyến đó trước` : (err?.error?.error ?? 'Không thể bắt đầu'),
        'Lỗi'
      );
    }
  }

  openComplete(r: MaintenanceRecord): void {
    this.completing.set(r);
    this.completeExpiry.set('');
    this.completeCost.set(r.cost != null ? String(r.cost) : '');
  }

  async submitComplete(): Promise<void> {
    const r = this.completing();
    if (!r) return;
    if (r.type === 'inspection' && !this.completeExpiry()) {
      this.toastr.warning('Nhập hạn đăng kiểm mới', 'Thiếu thông tin');
      return;
    }
    this.isActioning.set(true);
    try {
      await this.maintenanceService.complete(r._id, {
        inspectionExpiry: this.completeExpiry() || undefined,
        cost: this.completeCost() ? +this.completeCost() : undefined,
      });
      this.toastr.success(`Xe ${r.vehicle.registrationNumber} đã sẵn sàng hoạt động`, 'Thành công');
      this.completing.set(null);
      await this.reload();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? 'Không thể hoàn thành', 'Lỗi');
    } finally {
      this.isActioning.set(false);
    }
  }

  openCancel(r: MaintenanceRecord): void {
    this.cancelling.set(r);
    this.cancelReason.set('');
  }

  async submitCancel(): Promise<void> {
    const r = this.cancelling();
    if (!r) return;
    this.isActioning.set(true);
    try {
      await this.maintenanceService.cancel(r._id, this.cancelReason() || undefined);
      this.toastr.success('Đã hủy lịch bảo dưỡng', 'Thành công');
      this.cancelling.set(null);
      await this.reload();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? 'Không thể hủy', 'Lỗi');
    } finally {
      this.isActioning.set(false);
    }
  }

  async confirmDelete(): Promise<void> {
    const r = this.deleting();
    if (!r) return;
    this.isActioning.set(true);
    try {
      await this.maintenanceService.delete(r._id);
      this.toastr.success('Đã xóa lịch bảo dưỡng', 'Thành công');
      this.deleting.set(null);
      if (this.records().length === 1 && this.currentPage() > 1) this.currentPage.update(p => p - 1);
      await this.reload();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? 'Không thể xóa', 'Lỗi');
    } finally {
      this.isActioning.set(false);
    }
  }

  /** Reload the list and the bell (alerts depend on maintenance state) */
  private async reload(): Promise<void> {
    await Promise.all([this.loadRecords(), this.loadVehicles(), this.notifications.refresh()]);
  }

  // ─── Helpers ───────────────────────────────────────────────────
  getActions(r: MaintenanceRecord): MenuAction[] {
    const actions: MenuAction[] = [];
    if (this.allowUpdate()) {
      if (r.status === 'scheduled') {
        actions.push({ label: 'Bắt đầu (vào xưởng)', iconPaths: this.PLAY, color: 'success', action: () => this.start(r) });
        actions.push({ label: 'Chỉnh sửa', iconPaths: this.EDIT, color: 'warning', action: () => this.openEdit(r) });
      }
      if (r.status === 'in-progress') {
        actions.push({ label: 'Hoàn thành', iconPaths: this.CHECK, color: 'success', action: () => this.openComplete(r) });
      }
      if (r.status === 'scheduled' || r.status === 'in-progress') {
        actions.push({ label: 'Hủy', iconPaths: this.NOSYMBOL, color: 'danger', action: () => this.openCancel(r) });
      }
    }
    if (this.allowDelete() && (r.status === 'scheduled' || r.status === 'cancelled')) {
      actions.push({ label: 'Xóa', iconPaths: this.TRASH, color: 'danger', action: () => this.deleting.set(r) });
    }
    return actions;
  }

  isOverrunning(r: MaintenanceRecord): boolean {
    return r.status === 'in-progress' && new Date(r.scheduledEnd) < new Date();
  }

  formatDateTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  vehicleLabel(v: Vehicle): string {
    const status = v.status === 'maintenance' ? ' · đang bảo dưỡng' : v.status === 'out-of-service' ? ' · ngừng hoạt động' : '';
    return `${v.registrationNumber} · ${v.make} ${v.model}${status}`;
  }

  private toLocalInput(iso: string): string {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  private emptyForm(): MaintenanceForm {
    return { vehicle: '', type: 'periodic', scheduledStart: '', scheduledEnd: '', garage: '', cost: '', notes: '' };
  }

  readonly PLAY     = ['M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z'];
  readonly CHECK    = ['M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'];
  readonly EDIT     = ['M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z'];
  readonly NOSYMBOL = ['M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'];
  readonly TRASH    = ['M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0'];
}
