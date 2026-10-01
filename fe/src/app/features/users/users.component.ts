import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { RoleService } from '../../core/services/role.service';
import { User } from '../../core/models/auth.model';
import { Role } from '../../core/models/role.model';
import { ROLE_ORDER, roleLabel } from '../../core/constants/permissions';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActionMenuComponent, MenuAction } from '../../shared/components/action-menu/action-menu.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { AddButtonComponent } from '../../shared/components/add-button/add-button.component';

const MIN_PASSWORD_LENGTH = 6; // same as the User schema on the backend
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

type ModalMode = 'create' | 'edit';
type PendingAction = { kind: 'lock' | 'unlock' | 'delete'; user: User };

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent, ActionMenuComponent, SearchInputComponent, AddButtonComponent],
  templateUrl: './users.component.html',
  styleUrls: ['../bookings/bookings.component.css', './users.component.css'],
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private auth        = inject(AuthService);
  private toastr      = inject(ToastrService);

  // ─── Data ──────────────────────────────────────────────────────
  users     = signal<User[]>([]);
  roles     = signal<Role[]>([]);
  isLoading = signal(false);

  currentPage = signal(1);
  totalPages  = signal(1);
  total       = signal(0);
  readonly limit = 10;

  searchQuery  = signal('');
  roleFilter   = signal('');
  statusFilter = signal('');

  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  sortedRoles = computed(() =>
    [...this.roles()].sort((a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name))
  );
  readonly roleNames = ROLE_ORDER;

  // ─── Create / edit modal ───────────────────────────────────────
  modalOpen    = signal(false);
  modalMode    = signal<ModalMode>('create');
  editingUser  = signal<User | null>(null);
  isSubmitting = signal(false);
  showPassword = signal(false);
  form = signal({ name: '', email: '', password: '', roleName: 'staff' });

  isSelfEditing = computed(() => this.editingUser()?._id === this.auth.user()?._id);
  formError = computed(() => {
    const f = this.form();
    if (!f.name.trim()) return 'Vui lòng nhập họ tên';
    if (!EMAIL_PATTERN.test(f.email.trim())) return 'Email không hợp lệ';
    if (this.modalMode() === 'create' && f.password.length < MIN_PASSWORD_LENGTH) {
      return `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự`;
    }
    return null;
  });

  // ─── Lock / unlock / delete confirmation ───────────────────────
  pending     = signal<PendingAction | null>(null);
  isActioning = signal(false);

  confirmTitle = computed(() => {
    switch (this.pending()?.kind) {
      case 'lock':   return 'Khóa tài khoản?';
      case 'unlock': return 'Mở khóa tài khoản?';
      case 'delete': return 'Xóa tài khoản?';
      default:       return '';
    }
  });
  confirmMessage = computed(() => {
    const p = this.pending();
    if (!p) return '';
    // The dialog renders its message as HTML — escape user-provided text
    const who = `<strong>${escapeHtml(p.user.name)}</strong> (${escapeHtml(p.user.email)})`;
    switch (p.kind) {
      case 'lock':   return `Khóa ${who}?<br/>Người dùng sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được nữa.`;
      case 'unlock': return `Mở khóa ${who}? Người dùng có thể đăng nhập lại.`;
      case 'delete': return `Xóa vĩnh viễn ${who}?<br/>Không thể hoàn tác. Nếu chỉ muốn tạm ngừng, hãy dùng "Khóa".`;
    }
  });
  confirmLabel = computed(() => ({ lock: 'Khóa', unlock: 'Mở khóa', delete: 'Xóa' })[this.pending()?.kind ?? 'delete']);

  // ─── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  async loadUsers(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.userService.getAll({
        page: this.currentPage(),
        limit: this.limit,
        search: this.searchQuery() || undefined,
        role: this.roleFilter() || undefined,
        status: (this.statusFilter() || undefined) as 'active' | 'inactive' | undefined,
      });
      this.users.set(res.data);
      this.totalPages.set(res.totalPages || 1);
      this.total.set(res.total);
    } catch {
      this.toastr.error('Không thể tải danh sách người dùng', 'Lỗi');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      this.roles.set(await this.roleService.getRoles());
    } catch {
      this.toastr.warning('Không thể tải danh sách vai trò', 'Cảnh báo');
    }
  }

  // ─── Filters ───────────────────────────────────────────────────
  onSearch(value: string): void   { this.searchQuery.set(value);  this.currentPage.set(1); this.loadUsers(); }
  onRoleFilter(value: string): void { this.roleFilter.set(value); this.currentPage.set(1); this.loadUsers(); }
  onStatusFilter(value: string): void { this.statusFilter.set(value); this.currentPage.set(1); this.loadUsers(); }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadUsers();
  }

  // ─── Create / edit ─────────────────────────────────────────────
  openCreateModal(): void {
    this.form.set({ name: '', email: '', password: '', roleName: 'staff' });
    this.showPassword.set(false);
    this.editingUser.set(null);
    this.modalMode.set('create');
    this.modalOpen.set(true);
  }

  openEditModal(user: User): void {
    this.form.set({ name: user.name, email: user.email, password: '', roleName: user.role?.name ?? 'user' });
    this.editingUser.set(user);
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingUser.set(null);
  }

  updateField(field: 'name' | 'email' | 'password' | 'roleName', value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  async onSubmit(): Promise<void> {
    if (this.formError()) return;
    const f = this.form();
    this.isSubmitting.set(true);
    try {
      if (this.modalMode() === 'create') {
        await this.userService.create({
          name: f.name.trim(), email: f.email.trim(), password: f.password, roleName: f.roleName,
        });
        this.toastr.success(`Đã tạo tài khoản cho ${f.name.trim()}`, 'Thành công');
      } else {
        const user = this.editingUser()!;
        const role = this.roles().find(r => r.name === f.roleName);
        await this.userService.update(user._id, {
          name: f.name.trim(),
          email: f.email.trim(),
          // Backend refuses role changes on your own account
          ...(!this.isSelfEditing() && role && role.name !== user.role?.name ? { role: role._id } : {}),
        });
        this.toastr.success('Đã cập nhật tài khoản', 'Thành công');
        if (this.isSelfEditing()) await this.auth.refreshUser();
      }
      this.closeModal();
      await this.loadUsers();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? 'Không thể lưu tài khoản', 'Lỗi');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ─── Lock / unlock / delete ────────────────────────────────────
  ask(kind: PendingAction['kind'], user: User): void {
    this.pending.set({ kind, user });
  }

  cancelPending(): void {
    this.pending.set(null);
  }

  async confirmPending(): Promise<void> {
    const p = this.pending();
    if (!p) return;
    this.isActioning.set(true);
    try {
      if (p.kind === 'delete') {
        await this.userService.delete(p.user._id);
        this.toastr.success('Đã xóa tài khoản', 'Thành công');
        if (this.users().length === 1 && this.currentPage() > 1) this.currentPage.update(n => n - 1);
      } else {
        await this.userService.update(p.user._id, { isActive: p.kind === 'unlock' });
        this.toastr.success(p.kind === 'lock' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản', 'Thành công');
      }
      this.pending.set(null);
      await this.loadUsers();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? 'Thao tác thất bại', 'Lỗi');
    } finally {
      this.isActioning.set(false);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────
  isSelf(user: User): boolean {
    return user._id === this.auth.user()?._id;
  }

  roleLabel(name: string | undefined): string {
    return roleLabel(name);
  }

  formatDate(iso?: string): string {
    return iso ? new Date(iso).toLocaleDateString('vi-VN') : '—';
  }

  readonly EDIT   = ['M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z'];
  readonly LOCK   = ['M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z'];
  readonly UNLOCK = ['M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z'];
  readonly TRASH  = ['M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0'];

  /** Your own row only allows editing name/email (backend blocks the rest) */
  getActions(u: User): MenuAction[] {
    const actions: MenuAction[] = [
      { label: 'Chỉnh sửa', iconPaths: this.EDIT, color: 'warning', action: () => this.openEditModal(u) },
    ];
    if (!this.isSelf(u)) {
      actions.push(u.isActive
        ? { label: 'Khóa tài khoản', iconPaths: this.LOCK, color: 'danger', action: () => this.ask('lock', u) }
        : { label: 'Mở khóa', iconPaths: this.UNLOCK, color: 'success', action: () => this.ask('unlock', u) });
      actions.push({ label: 'Xóa', iconPaths: this.TRASH, color: 'danger', action: () => this.ask('delete', u) });
    }
    return actions;
  }
}
