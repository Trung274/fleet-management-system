# Angular Frontend — Fleet Management System

## Tổng quan

Frontend Angular 21 cho hệ thống quản lý xe, kết nối với Backend API tại `http://localhost:5000/api/v1`.

- **Framework**: Angular 21 (Standalone Components, SSR)
- **Styling**: Tailwind CSS v4 + Vanilla CSS (component-scoped)
- **HTTP Client**: Angular `HttpClient` (built-in)
- **State**: Angular **Signals** (built-in, không dùng thư viện ngoài)
- **Cookie**: `ngx-cookie-service`
- **Toast**: `ngx-toastr`
- **Dev server**: `http://localhost:4200`

---

## Khởi động

```bash
# Cài dependencies
npm install

# Chạy dev server
npm start          # → http://localhost:4200

# Build production
npm run build
```

> ⚠️ **Yêu cầu**: Backend phải chạy tại `http://localhost:5000` trước.

---

## Cấu trúc thư mục

```
src/
├── environments/
│   └── environment.ts          # API URL config (thay cho .env)
├── app/
│   ├── core/                   # Singleton services, guards, interceptors
│   │   ├── models/
│   │   │   └── auth.model.ts   # Interfaces: User, LoginCredentials, LoginResponse…
│   │   ├── services/
│   │   │   ├── auth.service.ts             # Auth state (Signals) + API calls
│   │   │   └── token-storage.service.ts    # Cookie CRUD cho token/user
│   │   ├── guards/
│   │   │   └── auth.guard.ts               # CanActivateFn → redirect /login
│   │   └── interceptors/
│   │       └── auth.interceptor.ts         # Bearer token + auto-refresh on 401
│   ├── features/               # Lazy-loaded pages
│   │   ├── auth/login/         # Trang đăng nhập
│   │   └── dashboard/          # Dashboard chính (protected)
│   ├── shared/                 # Components dùng chung
│   │   └── components/
│   │       ├── header/         # App header với user dropdown + logout
│   │       └── loading-spinner/ # Spinner overlay
│   ├── app.config.ts           # Root providers: HttpClient, Toastr, Router
│   ├── app.routes.ts           # Định nghĩa routes (lazy loading)
│   ├── app.ts                  # Root component
│   └── app.html                # <router-outlet /> only
└── styles.css                  # Global dark theme + Inter font + Toastr override
```

---

## Environment / Config

Không dùng `.env`. Cấu hình nằm trong `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api/v1',
};
```

Khi cần production, tạo `environment.prod.ts` và cấu hình `fileReplacements` trong `angular.json`.

---

## Authentication Flow

1. User vào `/` → redirect `/dashboard` → `authGuard` kiểm tra `isAuthenticated()`
2. Nếu chưa auth → redirect `/login`
3. Login form gọi `AuthService.login()` → `POST /auth/login`
4. Token + user được lưu vào Cookie qua `TokenStorageService`
5. `auth.interceptor.ts` tự đính kèm `Authorization: Bearer <token>` vào mọi request
6. Khi nhận 401 → tự gọi `POST /auth/refresh-token` → retry request gốc
7. Nếu refresh thất bại → clear cookie → redirect `/login`

---

## Patterns & Conventions

### State Management — Angular Signals
```typescript
// Trong service, KHÔNG dùng Subject/BehaviorSubject cho state đơn giản
private _user = signal<User | null>(null);
user = this._user.asReadonly();           // expose read-only
isAuthenticated = computed(() => !!this._user());
```

### HTTP calls
```typescript
// Dùng firstValueFrom() để convert Observable → Promise trong async methods
const result = await firstValueFrom(this.http.get<T>(url));
```

### Inject pattern (Angular 21)
```typescript
// Dùng inject() function thay vì constructor injection khi có thể
private auth = inject(AuthService);
```

### Component — Standalone + Lazy Loading
```typescript
// Tất cả components đều standalone: true
// Routes dùng loadComponent() để lazy load
{
  path: 'dashboard',
  loadComponent: () => import('./features/dashboard/dashboard.component')
    .then(m => m.DashboardComponent),
  canActivate: [authGuard],
}
```

### CSS — Component-scoped
- Mỗi component có file `.css` riêng (scoped)
- Global styles chỉ ở `src/styles.css`
- Dark theme: bg `#0a0f1e`, text `#f1f5f9`, accent `#3b82f6`

---

## Thêm tính năng mới

### 1. Thêm một page mới (có guard)

```bash
# Tạo thư mục
mkdir src/app/features/ten-page
```

Tạo các file:
- `ten-page.component.ts` — `standalone: true`, import cần thiết
- `ten-page.component.html`
- `ten-page.component.css`

Thêm route vào `app.routes.ts`:
```typescript
{
  path: 'ten-page',
  loadComponent: () => import('./features/ten-page/ten-page.component')
    .then(m => m.TenPageComponent),
  canActivate: [authGuard],
}
```

### 2. Thêm API service mới

Tạo `src/app/core/services/ten-service.service.ts`:
```typescript
@Injectable({ providedIn: 'root' })
export class TenService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getAll() {
    return this.http.get<ApiResponse>(`${this.apiUrl}/endpoint`);
  }
}
```

> Token được tự động gắn vào mọi request bởi `auth.interceptor.ts`, không cần làm thêm gì.

### 3. Thêm shared component

Tạo trong `src/app/shared/components/ten-component/`:
- Component phải `standalone: true`
- Export `class` và dùng trực tiếp qua `imports: []` trong component cha (không cần NgModule)

---

## CORS

Backend (BE) phải cho phép origin `http://localhost:4200`. Kiểm tra `be/.env`:

```
CORS_ORIGIN=http://localhost:3000,http://localhost:4200
```

Nếu thêm port mới, cập nhật `CORS_ORIGIN` và **restart BE**.
