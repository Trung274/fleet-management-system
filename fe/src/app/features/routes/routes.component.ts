import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { RouteService } from '../../core/services/route.service';
import {
  BusRoute,
  RouteStatus,
  ServiceType,
  RouteCreatePayload,
  RouteUpdatePayload,
} from '../../core/models/route.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

type ModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './routes.component.html',
  styleUrl: './routes.component.css',
})
export class RoutesComponent implements OnInit {
  private routeService = inject(RouteService);
  private toastr = inject(ToastrService);

  // ─── Data ──────────────────────────────────────────────────────
  routes = signal<BusRoute[]>([]);
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
  serviceTypeFilter = signal('');

  // ─── Modal ─────────────────────────────────────────────────────
  modalOpen = signal(false);
  modalMode = signal<ModalMode>('create');
  selectedRoute = signal<BusRoute | null>(null);
  deleteConfirmOpen = signal(false);
  routeToDelete = signal<BusRoute | null>(null);

  // ─── Form ──────────────────────────────────────────────────────
  form = signal<RouteCreatePayload>({
    name: '',
    code: '',
    description: '',
    origin: '',
    destination: '',
    distance: 0,
    estimatedDuration: 0,
    status: 'active',
    serviceType: 'local',
  });

  // ─── Computed ──────────────────────────────────────────────────
  isViewMode = computed(() => this.modalMode() === 'view');
  modalTitle = computed(() => {
    switch (this.modalMode()) {
      case 'create': return 'Thêm Tuyến Đường Mới';
      case 'edit':   return 'Chỉnh Sửa Tuyến Đường';
      case 'view':   return 'Thông Tin Tuyến Đường';
    }
  });

  readonly routeStatuses: { value: RouteStatus; label: string }[] = [
    { value: 'active',            label: 'Đang hoạt động' },
    { value: 'inactive',          label: 'Tạm dừng' },
    { value: 'under-maintenance', label: 'Đang bảo trì' },
    { value: 'discontinued',      label: 'Ngừng khai thác' },
  ];

  readonly serviceTypes: { value: ServiceType; label: string }[] = [
    { value: 'express', label: 'Tốc hành' },
    { value: 'local',   label: 'Thường' },
    { value: 'shuttle', label: 'Con thoi' },
  ];

  readonly pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  // ─── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadRoutes();
  }

  // ─── Data Loading ──────────────────────────────────────────────
  async loadRoutes(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.routeService.getAll({
        page: this.currentPage(),
        limit: this.limit,
        search: this.searchQuery() || undefined,
        status: this.statusFilter() || undefined,
        serviceType: this.serviceTypeFilter() || undefined,
        sort: '-createdAt',
      });
      this.routes.set(res.data);
      this.totalPages.set(res.totalPages);
      this.total.set(res.total);
    } catch {
      this.toastr.error('Không thể tải danh sách tuyến đường', 'Lỗi');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ─── Filter handlers ───────────────────────────────────────────
  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    this.loadRoutes();
  }

  onStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadRoutes();
  }

  onServiceTypeFilter(value: string): void {
    this.serviceTypeFilter.set(value);
    this.currentPage.set(1);
    this.loadRoutes();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadRoutes();
  }

  // ─── Modal ─────────────────────────────────────────────────────
  openCreateModal(): void {
    this.form.set({
      name: '', code: '', description: '',
      origin: '', destination: '',
      distance: 0, estimatedDuration: 0,
      status: 'active', serviceType: 'local',
    });
    this.modalMode.set('create');
    this.selectedRoute.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(route: BusRoute): void {
    this.selectedRoute.set(route);
    this.form.set({
      name: route.name,
      code: route.code,
      description: route.description ?? '',
      origin: route.origin,
      destination: route.destination,
      distance: route.distance,
      estimatedDuration: route.estimatedDuration,
      status: route.status,
      serviceType: route.serviceType,
    });
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  openViewModal(route: BusRoute): void {
    this.selectedRoute.set(route);
    this.modalMode.set('view');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedRoute.set(null);
  }

  // ─── CRUD ──────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.isViewMode()) return;
    this.isSubmitting.set(true);
    const payload = this.form();

    try {
      if (this.modalMode() === 'create') {
        await this.routeService.create(payload);
        this.toastr.success('Thêm tuyến đường thành công', 'Thành công');
      } else {
        await this.routeService.update(this.selectedRoute()!._id, payload as RouteUpdatePayload);
        this.toastr.success('Cập nhật tuyến đường thành công', 'Thành công');
      }
      this.closeModal();
      this.currentPage.set(1);
      await this.loadRoutes();
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Có lỗi xảy ra';
      this.toastr.error(msg, 'Lỗi');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  confirmDelete(route: BusRoute): void {
    this.routeToDelete.set(route);
    this.deleteConfirmOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.routeToDelete.set(null);
  }

  async executeDelete(): Promise<void> {
    const route = this.routeToDelete();
    if (!route) return;

    this.isDeleting.set(route._id);
    try {
      await this.routeService.delete(route._id);
      this.toastr.success(`Đã xóa tuyến "${route.name}"`, 'Thành công');
      this.cancelDelete();
      if (this.routes().length === 1 && this.currentPage() > 1) {
        this.currentPage.update(p => p - 1);
      }
      await this.loadRoutes();
    } catch (err: any) {
      this.toastr.error(err?.error?.message ?? 'Không thể xóa tuyến đường', 'Lỗi');
    } finally {
      this.isDeleting.set(null);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────
  getStatusLabel(status: RouteStatus): string {
    return this.routeStatuses.find(s => s.value === status)?.label ?? status;
  }

  getServiceTypeLabel(type: ServiceType): string {
    return this.serviceTypes.find(s => s.value === type)?.label ?? type;
  }

  formatDuration(minutes: number): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}g${m > 0 ? m + 'p' : ''}` : `${m}p`;
  }

  updateFormField(field: keyof RouteCreatePayload, value: unknown): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  updateNumericField(field: 'distance' | 'estimatedDuration', value: string): void {
    this.form.update(f => ({ ...f, [field]: parseFloat(value) || 0 }));
  }
}
