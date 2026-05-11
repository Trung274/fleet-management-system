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

type ModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
      const msg = err?.error?.message ?? 'Có lỗi xảy ra';
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
      const msg = err?.error?.message ?? 'Không thể xóa xe';
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
}
