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
import { ActionMenuComponent, MenuAction } from '../../shared/components/action-menu/action-menu.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { AddButtonComponent } from '../../shared/components/add-button/add-button.component';

type ModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, ActionMenuComponent, SearchInputComponent, AddButtonComponent],
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
      const msg = err?.error?.error ?? err?.message ?? 'Có lỗi xảy ra';
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
      this.toastr.error(err?.error?.error ?? err?.message ?? 'Không thể xóa tài xế', 'Lỗi');
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

  readonly EYE  = ['M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'];
  readonly EDIT = ['M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z'];
  readonly TRASH= ['M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0'];

  getActions(d: Driver): MenuAction[] {
    return [
      { label: 'Xem chi tiết', iconPaths: this.EYE,   action: () => this.openViewModal(d) },
      { label: 'Chỉnh sửa',   iconPaths: this.EDIT,  color: 'warning', action: () => this.openEditModal(d) },
      { label: 'Xóa',         iconPaths: this.TRASH, color: 'danger',  disabled: !!this.isDeleting(), action: () => this.confirmDelete(d) },
    ];
  }
}
