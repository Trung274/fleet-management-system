import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { VehicleService } from '../../core/services/vehicle.service';
import {
  Vehicle,
  VehicleStatus,
  VehicleCreatePayload,
  VehicleUpdatePayload,
} from '../../core/models/vehicle.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActionMenuComponent, MenuAction } from '../../shared/components/action-menu/action-menu.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { AddButtonComponent } from '../../shared/components/add-button/add-button.component';

type ModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, ActionMenuComponent, SearchInputComponent, AddButtonComponent],
  templateUrl: './vehicles.component.html',
  styleUrl: './vehicles.component.css',
})
export class VehiclesComponent implements OnInit {
  private vehicleService = inject(VehicleService);
  private toastr = inject(ToastrService);

  // ─── Data ──────────────────────────────────────────────────────
  vehicles = signal<Vehicle[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  isDeleting = signal<string | null>(null);

  // ─── Pagination ────────────────────────────────────────────────
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);
  readonly pageSize = 10;

  // ─── Filters ───────────────────────────────────────────────────
  searchQuery = signal('');
  filterStatus = signal('');

  // ─── Modal ─────────────────────────────────────────────────────
  isModalOpen = signal(false);
  modalMode = signal<ModalMode>('create');
  selectedVehicle = signal<Vehicle | null>(null);
  isDeleteConfirmOpen = signal(false);
  vehicleToDelete = signal<Vehicle | null>(null);

  // ─── Form state ────────────────────────────────────────────────
  form: VehicleCreatePayload = this.emptyForm();

  readonly statuses: VehicleStatus[] = ['active', 'maintenance', 'out-of-service', 'retired'];

  readonly currentYear = new Date().getFullYear();

  // ─── Computed ──────────────────────────────────────────────────
  isViewMode = computed(() => this.modalMode() === 'view');
  isEditOrCreate = computed(() => this.modalMode() !== 'view');

  async ngOnInit(): Promise<void> {
    await this.loadVehicles();
  }

  async loadVehicles(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.vehicleService.getAll({
        page: this.currentPage(),
        limit: this.pageSize,
        search: this.searchQuery() || undefined,
        status: this.filterStatus() || undefined,
        sort: '-createdAt',
      });
      this.vehicles.set(res.data);
      this.total.set(res.total);
      this.totalPages.set(res.totalPages);
    } catch {
      this.toastr.error('Không thể tải danh sách xe', 'Lỗi');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ─── Search / Filter ───────────────────────────────────────────
  async onSearch(value: string): Promise<void> {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    await this.loadVehicles();
  }

  async onFilterStatus(value: string): Promise<void> {
    this.filterStatus.set(value);
    this.currentPage.set(1);
    await this.loadVehicles();
  }

  // ─── Pagination ────────────────────────────────────────────────
  async goToPage(page: number): Promise<void> {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    await this.loadVehicles();
  }

  get pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const range: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  // ─── Modal ─────────────────────────────────────────────────────
  openCreate(): void {
    this.form = this.emptyForm();
    this.modalMode.set('create');
    this.selectedVehicle.set(null);
    this.isModalOpen.set(true);
  }

  openEdit(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.form = {
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      capacity: vehicle.capacity,
      status: vehicle.status,
      color: vehicle.color ?? '',
      vin: vehicle.vin ?? '',
      notes: vehicle.notes ?? '',
    };
    this.modalMode.set('edit');
    this.isModalOpen.set(true);
  }

  openView(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.modalMode.set('view');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedVehicle.set(null);
  }

  // ─── Submit ────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const payload: any = { ...this.form };
    // Remove empty optional fields
    if (!payload.color) delete payload.color;
    if (!payload.vin) delete payload.vin;
    if (!payload.notes) delete payload.notes;

    try {
      if (this.modalMode() === 'create') {
        await this.vehicleService.create(payload as VehicleCreatePayload);
        this.toastr.success('Thêm xe thành công', 'Thành công');
      } else {
        const id = this.selectedVehicle()!._id;
        await this.vehicleService.update(id, payload as VehicleUpdatePayload);
        this.toastr.success('Cập nhật xe thành công', 'Thành công');
      }
      this.closeModal();
      await this.loadVehicles();
    } catch (err: any) {
      const msg = err?.error?.error ?? err?.message ?? 'Có lỗi xảy ra';
      this.toastr.error(msg, 'Lỗi');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────
  confirmDelete(vehicle: Vehicle): void {
    this.vehicleToDelete.set(vehicle);
    this.isDeleteConfirmOpen.set(true);
  }

  cancelDelete(): void {
    this.vehicleToDelete.set(null);
    this.isDeleteConfirmOpen.set(false);
  }

  async executeDelete(): Promise<void> {
    const vehicle = this.vehicleToDelete();
    if (!vehicle) return;
    this.isDeleting.set(vehicle._id);
    try {
      await this.vehicleService.delete(vehicle._id);
      this.toastr.success('Đã xóa xe', 'Thành công');
      this.cancelDelete();
      // If last item on page and not first page, go back one
      if (this.vehicles().length === 1 && this.currentPage() > 1) {
        this.currentPage.update(p => p - 1);
      }
      await this.loadVehicles();
    } catch (err: any) {
      const msg = err?.error?.error ?? err?.message ?? 'Không thể xóa xe';
      this.toastr.error(msg, 'Lỗi');
    } finally {
      this.isDeleting.set(null);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────
  private emptyForm(): VehicleCreatePayload {
    return {
      registrationNumber: '',
      make: '',
      model: '',
      year: this.currentYear,
      capacity: 30,
      status: 'active',
      color: '',
      vin: '',
      notes: '',
    };
  }

  statusLabel(status: VehicleStatus): string {
    const map: Record<VehicleStatus, string> = {
      active: 'Hoạt động',
      maintenance: 'Bảo dưỡng',
      'out-of-service': 'Ngừng hoạt động',
      retired: 'Đã nghỉ hưu',
    };
    return map[status] ?? status;
  }

  statusClass(status: VehicleStatus): string {
    const map: Record<VehicleStatus, string> = {
      active: 'badge-active',
      maintenance: 'badge-maintenance',
      'out-of-service': 'badge-out',
      retired: 'badge-retired',
    };
    return map[status] ?? '';
  }

  trackById(_: number, v: Vehicle): string {
    return v._id;
  }

  readonly EYE  = ['M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'];
  readonly EDIT = ['M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z'];
  readonly TRASH= ['M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0'];

  getActions(v: Vehicle): MenuAction[] {
    return [
      { label: 'Xem chi tiết',  iconPaths: this.EYE,   action: () => this.openView(v) },
      { label: 'Chỉnh sửa',    iconPaths: this.EDIT,  color: 'warning', action: () => this.openEdit(v) },
      { label: 'Xóa',          iconPaths: this.TRASH, color: 'danger',  disabled: !!this.isDeleting(), action: () => this.confirmDelete(v) },
    ];
  }
}
