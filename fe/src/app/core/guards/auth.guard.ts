import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);

  // On server-side rendering, cookies are not available.
  // Always allow through — the client-side guard will re-check after hydration.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const auth = inject(AuthService);
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  // Primary check: signal state (already restored from cookie in AuthService constructor)
  if (auth.isAuthenticated()) {
    return true;
  }

  // Fallback: check raw cookie directly in case signals haven't been set yet
  const token = tokenStorage.getToken();
  if (token) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
