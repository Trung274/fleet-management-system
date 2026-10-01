import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard, RoutePermission } from './core/guards/permission.guard';

/** Page requires `resource:action` — same permission the backend checks for its list API */
const requires = (resource: string, action = 'read') => ({
  canActivate: [permissionGuard],
  data: { permission: { resource, action } satisfies RoutePermission },
});

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
        // Every signed-in user can see the dashboard
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
        ...requires('vehicles'),
      },
      {
        path: 'drivers',
        loadComponent: () =>
          import('./features/drivers/drivers.component').then(
            (m) => m.DriversComponent,
          ),
        ...requires('drivers'),
      },
      {
        path: 'routes',
        loadComponent: () =>
          import('./features/routes/routes.component').then(
            (m) => m.RoutesComponent,
          ),
        ...requires('routes'),
      },
      {
        path: 'trips',
        loadComponent: () =>
          import('./features/trips/trips.component').then(
            (m) => m.TripsComponent,
          ),
        ...requires('trips'),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/bookings/bookings.component').then(
            (m) => m.BookingsComponent,
          ),
        ...requires('bookings'),
      },
      {
        // Itineraries use the bookings permissions on the backend
        path: 'itineraries',
        loadComponent: () =>
          import('./features/itineraries/itineraries.component').then(
            (m) => m.ItinerariesComponent,
          ),
        ...requires('bookings'),
      },
      {
        // Every signed-in user can manage their own account (incl. password)
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        // Backend restricts /roles and /permissions to the admin role itself
        path: 'roles',
        loadComponent: () =>
          import('./features/roles/roles.component').then(
            (m) => m.RolesComponent,
          ),
        canActivate: [permissionGuard],
        data: { adminOnly: true },
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
