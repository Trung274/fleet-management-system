import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { RoleService } from '../../core/services/role.service';
import { PermissionItem, Role } from '../../core/models/role.model';

/** Resources shown in the matrix. users/roles/permissions are left out: their
 *  endpoints check the admin role directly, so granting them to others does nothing. */
const RESOURCES: { key: string; label: string }[] = [
  { key: 'vehicles', label: 'Xe' },
  { key: 'drivers',  label: 'Tài xế' },
  { key: 'routes',   label: 'Tuyến đường' },
  { key: 'trips',    label: 'Chuyến đi' },
  { key: 'seats',    label: 'Ghế ngồi' },
  { key: 'bookings', label: 'Đặt vé & Hành trình' },
  { key: 'profile',  label: 'Hồ sơ cá nhân' },
];

const ACTION_ORDER = ['read', 'list', 'create', 'update', 'delete'];

/** What each permission allows in this app (falls back to a generic label) */
const PERMISSION_LABELS: Record<string, string> = {
  'vehicles:read': 'Xem danh sách xe',
  'vehicles:create': 'Thêm xe',
  'vehicles:update': 'Sửa thông tin xe',
  'vehicles:delete': 'Xóa xe',
  'drivers:read': 'Xem danh sách tài xế',
  'drivers:create': 'Thêm tài xế',
  'drivers:update': 'Sửa thông tin tài xế',
  'drivers:delete': 'Xóa tài xế',
  'routes:read': 'Xem danh sách tuyến',
  'routes:create': 'Thêm tuyến',
  'routes:update': 'Sửa tuyến và điểm dừng',
  'routes:delete': 'Xóa tuyến',
  'trips:read': 'Xem danh sách chuyến',
  'trips:create': 'Lên lịch chuyến',
  'trips:update': 'Sửa, xuất phát, hoàn thành, báo trễ, hủy chuyến',
  'trips:delete': 'Xóa chuyến',
  'seats:read': 'Xem sơ đồ ghế',
  'seats:update': 'Khởi tạo ghế, đánh dấu ghế hỏng',
  'bookings:read': 'Xem đặt vé và hành trình',
  'bookings:create': 'Đặt vé, đặt hành trình',
  'bookings:update': 'Xác nhận, hủy vé và hành trình',
  'bookings:delete': 'Xóa vé đã hủy',
  'profile:read': 'Xem hồ sơ của mình',
  'profile:update': 'Sửa hồ sơ của mình',
};
const ACTION_LABELS: Record<string, string> = {
  read: 'Xem', list: 'Xem danh sách', create: 'Tạo mới', update: 'Cập nhật', delete: 'Xóa',
};

const ROLE_ORDER = ['admin', 'manager', 'staff', 'user'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên', manager: 'Quản lý', staff: 'Nhân viên', user: 'Người dùng',
};

/** A form only works if the role can also read the lists it needs */
const DEPENDENCIES: { needs: string; ifAny: string[]; reason: string }[] = [
  { ifAny: ['trips:create', 'trips:update'], needs: 'routes:read',   reason: 'form chuyến đi cần danh sách tuyến' },
  { ifAny: ['trips:create', 'trips:update'], needs: 'vehicles:read', reason: 'form chuyến đi cần danh sách xe' },
  { ifAny: ['trips:create', 'trips:update'], needs: 'drivers:read',  reason: 'form chuyến đi cần danh sách tài xế' },
  { ifAny: ['bookings:create'],              needs: 'trips:read',    reason: 'đặt vé cần chọn chuyến' },
  { ifAny: ['bookings:create'],              needs: 'seats:read',    reason: 'đặt vé cần chọn ghế' },
];

interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionItem[];
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roles.component.html',
  styleUrls: ['../bookings/bookings.component.css', './roles.component.css'],
})
export class RolesComponent implements OnInit {
  private roleService = inject(RoleService);
  private toastr      = inject(ToastrService);

  // ─── Data ──────────────────────────────────────────────────────
  roles       = signal<Role[]>([]);
  permissions = signal<PermissionItem[]>([]);
  isLoading   = signal(false);
  isSaving    = signal(false);

  /** roleId → permission ids being edited (starts as a copy of what is saved) */
  draft = signal<Record<string, Set<string>>>({});

  // ─── Computed ──────────────────────────────────────────────────
  sortedRoles = computed(() =>
    [...this.roles()].sort((a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name))
  );

  groups = computed<PermissionGroup[]>(() =>
    RESOURCES
      .map(r => ({
        key: r.key,
        label: r.label,
        permissions: this.permissions()
          .filter(p => p.resource === r.key)
          .sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action)),
      }))
      .filter(g => g.permissions.length > 0)
  );

  /** Permission ids per role as saved on the server */
  private saved = computed(() =>
    Object.fromEntries(this.roles().map(r => [r._id, new Set(r.permissions.map(p => p._id))]))
  );

  changedRoleIds = computed(() =>
    this.roles()
      .filter(r => !this.sameSet(this.draft()[r._id], this.saved()[r._id]))
      .map(r => r._id)
  );

  changeCount = computed(() =>
    this.changedRoleIds().reduce((sum, id) => {
      const draft = this.draft()[id] ?? new Set<string>();
      const saved = this.saved()[id] ?? new Set<string>();
      return sum + [...draft].filter(p => !saved.has(p)).length + [...saved].filter(p => !draft.has(p)).length;
    }, 0)
  );

  /** Missing read permissions that would leave a granted form without data */
  warnings = computed(() => {
    const keyOf = new Map(this.permissions().map(p => [p._id, `${p.resource}:${p.action}`]));
    const result: { role: string; message: string }[] = [];
    for (const role of this.sortedRoles()) {
      if (this.isAdmin(role)) continue;
      const granted = new Set([...(this.draft()[role._id] ?? [])].map(id => keyOf.get(id)));
      for (const dep of DEPENDENCIES) {
        if (dep.ifAny.some(k => granted.has(k)) && !granted.has(dep.needs)) {
          result.push({
            role: this.roleLabel(role),
            message: `thiếu "${this.permissionLabel(dep.needs)}" (${dep.reason})`,
          });
        }
      }
    }
    return result;
  });

  // ─── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [roles, permissions] = await Promise.all([
        this.roleService.getRoles(),
        this.roleService.getPermissions(),
      ]);
      this.roles.set(roles);
      this.permissions.set(permissions);
      this.resetDraft();
    } catch {
      this.toastr.error('Không thể tải vai trò và quyền', 'Lỗi');
    } finally {
      this.isLoading.set(false);
    }
  }

  resetDraft(): void {
    this.draft.set(
      Object.fromEntries(this.roles().map(r => [r._id, new Set(r.permissions.map(p => p._id))]))
    );
  }

  // ─── Editing ───────────────────────────────────────────────────
  isAdmin(role: Role): boolean {
    return role.name === 'admin';
  }

  has(role: Role, perm: PermissionItem): boolean {
    return this.draft()[role._id]?.has(perm._id) ?? false;
  }

  isChanged(role: Role, perm: PermissionItem): boolean {
    return this.has(role, perm) !== (this.saved()[role._id]?.has(perm._id) ?? false);
  }

  toggle(role: Role, perm: PermissionItem): void {
    this.draft.update(d => {
      const next = new Set(d[role._id]);
      if (next.has(perm._id)) next.delete(perm._id); else next.add(perm._id);
      return { ...d, [role._id]: next };
    });
  }

  groupState(role: Role, group: PermissionGroup): 'all' | 'some' | 'none' {
    const count = group.permissions.filter(p => this.has(role, p)).length;
    if (count === 0) return 'none';
    return count === group.permissions.length ? 'all' : 'some';
  }

  /** Header checkbox: grant the whole group, or revoke it if already fully granted */
  toggleGroup(role: Role, group: PermissionGroup): void {
    const grantAll = this.groupState(role, group) !== 'all';
    this.draft.update(d => {
      const next = new Set(d[role._id]);
      group.permissions.forEach(p => grantAll ? next.add(p._id) : next.delete(p._id));
      return { ...d, [role._id]: next };
    });
  }

  grantedCount(role: Role): number {
    const visible = new Set(this.groups().flatMap(g => g.permissions.map(p => p._id)));
    return [...(this.draft()[role._id] ?? [])].filter(id => visible.has(id)).length;
  }

  totalVisible(): number {
    return this.groups().reduce((sum, g) => sum + g.permissions.length, 0);
  }

  // ─── Save ──────────────────────────────────────────────────────
  async save(): Promise<void> {
    const ids = this.changedRoleIds();
    if (ids.length === 0) return;
    this.isSaving.set(true);
    try {
      // Send the full permission list; ids outside the matrix are kept as they were
      await Promise.all(ids.map(id =>
        this.roleService.updateRole(id, { permissions: [...this.draft()[id]] })
      ));
      this.toastr.success(
        'Đã lưu phân quyền. Người dùng sẽ thấy thay đổi khi tải lại trang.',
        'Thành công',
      );
      await this.load();
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? err?.message ?? 'Không thể lưu phân quyền', 'Lỗi');
    } finally {
      this.isSaving.set(false);
    }
  }

  // ─── Labels ────────────────────────────────────────────────────
  roleLabel(role: Role): string {
    return ROLE_LABELS[role.name] ?? role.name;
  }

  permissionLabel(key: string): string {
    return PERMISSION_LABELS[key] ?? ACTION_LABELS[key.split(':')[1]] ?? key;
  }

  permKey(p: PermissionItem): string {
    return `${p.resource}:${p.action}`;
  }

  private sameSet(a?: Set<string>, b?: Set<string>): boolean {
    if (!a || !b) return a === b;
    return a.size === b.size && [...a].every(x => b.has(x));
  }
}
