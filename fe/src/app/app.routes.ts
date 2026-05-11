import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'vehicles',
        loadComponent: () =>
          import('./features/vehicles/vehicles.component').then(
            (m) => m.VehiclesComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
