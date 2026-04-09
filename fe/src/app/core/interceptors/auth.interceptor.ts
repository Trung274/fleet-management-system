import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, from, BehaviorSubject, filter, take } from 'rxjs';
import { TokenStorageService } from '../services/token-storage.service';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = tokenStorage.getToken();
  const authReq = token ? addAuthHeader(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only handle 401 on non-auth endpoints
      if (
        error.status !== 401 ||
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh-token')
      ) {
        return throwError(() => error);
      }

      if (isRefreshing) {
        // Queue requests while refreshing
        return refreshTokenSubject.pipe(
          filter((t) => t !== null),
          take(1),
          switchMap((newToken) => next(addAuthHeader(req, newToken!))),
        );
      }

      isRefreshing = true;
      refreshTokenSubject.next(null);

      return from(authService.refreshAccessToken()).pipe(
        switchMap((success) => {
          isRefreshing = false;
          if (success) {
            const newToken = tokenStorage.getToken()!;
            refreshTokenSubject.next(newToken);
            return next(addAuthHeader(req, newToken));
          } else {
            refreshTokenSubject.next(null);
            router.navigate(['/login']);
            return throwError(() => error);
          }
        }),
        catchError((err) => {
          isRefreshing = false;
          refreshTokenSubject.next(null);
          tokenStorage.clearAll();
          router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
    }),
  );
};
