import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth.service';

export interface RoutePermission {
  resource: string;
  action: string;
}

/**
 * Blocks a page unless the user has `route.data.permission`.
 * Hiding the sidebar link is not enough — this also covers typing the URL directly.
 */
export const permissionGuard: CanActivateFn = async (route) => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const required = route.data['permission'] as RoutePermission | undefined;
  // Some backend routes check the role name (authorize('admin')), not a permission
  const adminOnly = route.data['adminOnly'] === true;
  if (!required && !adminOnly) return true;

  // After a refresh the user may not be restored yet — load it before deciding
  if (!auth.user()) {
    await auth.tryLoadUser();
  }

  const allowed = adminOnly
    ? auth.isAdmin()
    : auth.can(required!.resource, required!.action);
  if (allowed) {
    return true;
  }

  toastr.warning('Bạn không có quyền truy cập trang này', 'Không có quyền');
  return router.createUrlTree(['/dashboard']);
};
