import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { DriverService } from '../../core/services/driver.service';
import {
  Driver,
  EmploymentStatus,
  LicenseType,
  DriverCreatePayload,
  DriverUpdatePayload,
} from '../../core/models/driver.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

type ModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './drivers.component.html',
  styleUrl: './drivers.component.css',
})
export class DriversComponent implements OnInit {
  private driverService = inject(DriverService);
  private toastr = inject(ToastrService);

  // ─── Data ──────────────────────────────────────────────────────
  drivers = signal<Driver[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  isDeleting = signal<string | null>(null);

  // ─── Pagination ────────────────────────────────────────────────
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);
  readonly limit = 10;

  // ─── Filters ───────────────────────────────────────────────────
  searchQuery = signal('');
  statusFilter = signal('');
  licenseTypeFilter = signal('');

  // ─── Modal ─────────────────────────────────────────────────────
  modalOpen = signal(false);
  modalMode = signal<ModalMode>('create');
  selectedDriver = signal<Driver | null>(null);
  deleteConfirmOpen = signal(false);
  driverToDelete = signal<Driver | null>(null);

  // ─── Form ──────────────────────────────────────────────────────
  form = signal<DriverCreatePayload>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    licenseNumber: '',
    licenseType: 'Class B',
    licenseExpiry: '',
    employmentStatus: 'active',
    hireDate: '',
    emergencyContact: { name: '', phone: '', relationship: '' },
    notes: '',
  });

  // ─── Computed ──────────────────────────────────────────────────
  isViewMode = computed(() => this.modalMode() === 'view');
  modalTitle = computed(() => {
    switch (this.modalMode()) {
      case 'create': return 'Thêm Tài Xế Mới';
      case 'edit':   return 'Chỉnh Sửa Tài Xế';
      case 'view':   return 'Thông Tin Tài Xế';
    }
  });

  readonly employmentStatuses: { value: EmploymentStatus; label: string }[] = [
    { value: 'active',     label: 'Đang làm việc' },
    { value: 'on-leave',   label: 'Nghỉ phép' },
    { value: 'suspended',  label: 'Tạm đình chỉ' },
    { value: 'terminated', label: 'Đã nghỉ việc' },
  ];

  readonly licenseTypes: LicenseType[] = ['Class A', 'Class B', 'Class C'];

  readonly pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  // ─── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadDrivers();
  }

  // ─── Data Loading ──────────────────────────────────────────────
  async loadDrivers(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.driverService.getAll({
        page: this.currentPage(),
        limit: this.limit,
        search: this.searchQuery() || undefined,
        status: this.statusFilter() || undefined,
        licenseType: this.licenseTypeFilter() || undefined,
        sort: '-createdAt',
      });
      this.drivers.set(res.data);
      this.totalPages.set(res.totalPages);
      this.total.set(res.total);
    } catch {
      this.toastr.error('Không thể tải danh sách tài xế', 'Lỗi');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ─── Filter handlers ───────────────────────────────────────────
  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    this.loadDrivers();
  }

  onStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadDrivers();
  }

  onLicenseTypeFilter(value: string): void {
    this.licenseTypeFilter.set(value);
    this.currentPage.set(1);
    this.loadDrivers();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadDrivers();
  }

  // ─── Modal ─────────────────────────────────────────────────────
  openCreateModal(): void {
    this.form.set({
      firstName: '', lastName: '', email: '', phone: '',
      dateOfBirth: '', address: '',
      licenseNumber: '', licenseType: 'Class B', licenseExpiry: '',
      employmentStatus: 'active', hireDate: '',
      emergencyContact: { name: '', phone: '', relationship: '' },
      notes: '',
    });
    this.modalMode.set('create');
    this.selectedDriver.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(driver: Driver): void {
    this.selectedDriver.set(driver);
    this.form.set({
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone,
      dateOfBirth: driver.dateOfBirth ? driver.dateOfBirth.substring(0, 10) : '',
      address: driver.address ?? '',
      licenseNumber: driver.licenseNumber,
      licenseType: driver.licenseType,
      licenseExpiry: driver.licenseExpiry.substring(0, 10),
      employmentStatus: driver.employmentStatus,
      hireDate: driver.hireDate ? driver.hireDate.substring(0, 10) : '',
      emergencyContact: {
        name: driver.emergencyContact?.name ?? '',
        phone: driver.emergencyContact?.phone ?? '',
        relationship: driver.emergencyContact?.relationship ?? '',
      },
      notes: driver.notes ?? '',
    });
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  openViewModal(driver: Driver): void {
    this.selectedDriver.set(driver);
    this.modalMode.set('view');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedDriver.set(null);
  }

  // ─── CRUD ──────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.isViewMode()) return;
    this.isSubmitting.set(true);
    const payload = this.form();

    try {
      if (this.modalMode() === 'create') {
        await this.driverService.create(payload);
        this.toastr.success('Thêm tài xế thành công', 'Thành công');
      } else {
        await this.driverService.update(this.selectedDriver()!._id, payload as DriverUpdatePayload);
        this.toastr.success('Cập nhật tài xế thành công', 'Thành công');
      }
      this.closeModal();
      this.currentPage.set(1);
      await this.loadDrivers();
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Có lỗi xảy ra';
      this.toastr.error(msg, 'Lỗi');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  confirmDelete(driver: Driver): void {
    this.driverToDelete.set(driver);
    this.deleteConfirmOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.driverToDelete.set(null);
  }

  async executeDelete(): Promise<void> {
    const driver = this.driverToDelete();
    if (!driver) return;

    this.isDeleting.set(driver._id);
    try {
      await this.driverService.delete(driver._id);
      this.toastr.success(`Đã xóa tài xế "${driver.firstName} ${driver.lastName}"`, 'Thành công');
      this.cancelDelete();
      if (this.drivers().length === 1 && this.currentPage() > 1) {
        this.currentPage.update(p => p - 1);
      }
      await this.loadDrivers();
    } catch (err: any) {
      this.toastr.error(err?.error?.message ?? 'Không thể xóa tài xế', 'Lỗi');
    } finally {
      this.isDeleting.set(null);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────
  getStatusLabel(status: EmploymentStatus): string {
    return this.employmentStatuses.find(s => s.value === status)?.label ?? status;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  }

  /** Min date for licenseExpiry: today (backend accepts today or future) */
  get minLicenseExpiry(): string {
    return new Date().toISOString().substring(0, 10);
  }

  /** Max date for dateOfBirth: today */
  get maxDateOfBirth(): string {
    return new Date().toISOString().substring(0, 10);
  }

  updateFormField(field: keyof DriverCreatePayload, value: unknown): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  updateEmergencyField(field: 'name' | 'phone' | 'relationship', value: string): void {
    this.form.update(f => ({
      ...f,
      emergencyContact: { ...f.emergencyContact, [field]: value },
    }));
  }
}
