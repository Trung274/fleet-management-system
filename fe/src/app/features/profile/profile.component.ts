import { Component, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import {
  ACTION_ORDER,
  PERMISSION_RESOURCES,
  permissionLabel,
  roleLabel,
} from '../../core/constants/permissions';

const MIN_PASSWORD_LENGTH = 6; // same as the User schema on the backend
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['../bookings/bookings.component.css', './profile.component.css'],
})
export class ProfileComponent {
  private auth   = inject(AuthService);
  private toastr = inject(ToastrService);

  user = this.auth.user;
  isAdmin = this.auth.isAdmin;
  canEditProfile = computed(() => this.auth.can('profile', 'update'));

  // ─── Account info ──────────────────────────────────────────────
  initial   = computed(() => (this.user()?.name ?? 'U').charAt(0).toUpperCase());
  roleName  = computed(() => this.user()?.role?.name ?? '');
  roleText  = computed(() => roleLabel(this.roleName()));
  createdBy = computed(() => {
    const c = this.user()?.createdBy;
    return c && typeof c === 'object' ? c.name : null;
  });

  // ─── Edit name / email ─────────────────────────────────────────
  name  = signal('');
  email = signal('');
  isSavingInfo = signal(false);

  infoChanged = computed(() =>
    this.name().trim() !== (this.user()?.name ?? '') || this.email().trim() !== (this.user()?.email ?? '')
  );
  infoError = computed(() => {
    if (!this.name().trim()) return 'Họ tên không được để trống';
    if (!EMAIL_PATTERN.test(this.email().trim())) return 'Email không hợp lệ';
    return null;
  });

  // ─── Change password ───────────────────────────────────────────
  currentPassword = signal('');
  newPassword     = signal('');
  confirmPassword = signal('');
  showPasswords   = signal(false);
  isSavingPassword = signal(false);
  readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  /** 0–4: length ≥ 8, lower+upper case, digit, special character */
  passwordScore = computed(() => {
    const p = this.newPassword();
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  });
  passwordStrength = computed(() => {
    const p = this.newPassword();
    if (!p) return null;
    if (p.length < MIN_PASSWORD_LENGTH) return { level: 'weak', label: `Cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự` };
    const score = this.passwordScore();
    if (score <= 1) return { level: 'weak', label: 'Yếu' };
    if (score <= 2) return { level: 'medium', label: 'Trung bình' };
    return { level: 'strong', label: 'Mạnh' };
  });
  passwordError = computed(() => {
    if (!this.currentPassword() || !this.newPassword() || !this.confirmPassword()) return 'missing';
    if (this.newPassword().length < MIN_PASSWORD_LENGTH) return `Mật khẩu mới cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự`;
    if (this.newPassword() === this.currentPassword()) return 'Mật khẩu mới phải khác mật khẩu hiện tại';
    if (this.newPassword() !== this.confirmPassword()) return 'Mật khẩu nhập lại không khớp';
    return null;
  });

  // ─── My permissions ────────────────────────────────────────────
  permissionGroups = computed(() => {
    const granted = new Set(
      (this.user()?.role?.permissions ?? [])
        .filter(p => p.isActive !== false)
        .map(p => `${p.resource}:${p.action}`),
    );
    return PERMISSION_RESOURCES
      .map(r => ({
        label: r.label,
        items: [...granted]
          .filter(k => k.startsWith(r.key + ':'))
          .sort((a, b) => ACTION_ORDER.indexOf(a.split(':')[1]) - ACTION_ORDER.indexOf(b.split(':')[1]))
          .map(k => permissionLabel(k)),
      }))
      .filter(g => g.items.length > 0);
  });
  permissionCount = computed(() => this.permissionGroups().reduce((n, g) => n + g.items.length, 0));

  constructor() {
    // Fill the form from the user (also after /auth/me refreshes it)
    effect(() => {
      const u = this.user();
      if (u) {
        this.name.set(u.name);
        this.email.set(u.email);
      }
    });
  }

  // ─── Actions ───────────────────────────────────────────────────
  resetInfo(): void {
    this.name.set(this.user()?.name ?? '');
    this.email.set(this.user()?.email ?? '');
  }

  async saveInfo(): Promise<void> {
    if (this.infoError() || !this.infoChanged()) return;
    this.isSavingInfo.set(true);
    try {
      await this.auth.updateProfile({ name: this.name().trim(), email: this.email().trim() });
      this.toastr.success('Đã cập nhật thông tin cá nhân', 'Thành công');
    } catch (err: any) {
      this.toastr.error(err?.error?.error ?? 'Không thể cập nhật thông tin', 'Lỗi');
    } finally {
      this.isSavingInfo.set(false);
    }
  }

  async savePassword(): Promise<void> {
    if (this.passwordError()) return;
    this.isSavingPassword.set(true);
    try {
      await this.auth.changePassword(this.currentPassword(), this.newPassword());
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
      this.toastr.success('Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.', 'Thành công');
    } catch (err: any) {
      const msg = err?.error?.error ?? '';
      const text = /current password is incorrect/i.test(msg)
        ? 'Mật khẩu hiện tại không đúng'
        : msg || 'Không thể đổi mật khẩu';
      this.toastr.error(text, 'Lỗi');
    } finally {
      this.isSavingPassword.set(false);
    }
  }

  formatDate(iso?: string): string {
    return iso ? new Date(iso).toLocaleDateString('vi-VN') : '—';
  }
}
