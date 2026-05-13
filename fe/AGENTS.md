# Angular Frontend — Fleet Management System

## Tổng quan

Frontend Angular 21 cho hệ thống quản lý xe, kết nối với Backend API tại `http://localhost:5000/api/v1`.

- **Framework**: Angular 21 (Standalone Components, SSR với RenderMode.Client)
- **Styling**: Tailwind CSS v4 + Vanilla CSS (component-scoped)
- **HTTP Client**: Angular `HttpClient` (built-in)
- **State**: Angular **Signals** (built-in, không dùng thư viện ngoài)
- **Cookie**: `ngx-cookie-service`
- **Toast**: `ngx-toastr` ← **TOÀN BỘ thông báo user dùng toast, KHÔNG dùng alert()**
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
│   └── environment.ts              # API URL config (thay cho .env)
├── app/
│   ├── core/                       # Singleton services, guards, interceptors
│   │   ├── models/
│   │   │   ├── auth.model.ts       # User, LoginCredentials, LoginResponse…
│   │   │   └── vehicle.model.ts    # Vehicle, VehicleCreatePayload…
│   │   ├── services/
│   │   │   ├── auth.service.ts     # Auth state (Signals) + API calls
│   │   │   ├── token-storage.service.ts  # Cookie CRUD cho token/user
│   │   │   └── vehicle.service.ts  # CRUD service cho Vehicles
│   │   ├── guards/
│   │   │   └── auth.guard.ts       # Platform-aware guard → redirect /login
│   │   └── interceptors/
│   │       └── auth.interceptor.ts # Bearer token + auto-refresh on 401
│   ├── features/                   # Lazy-loaded pages
│   │   ├── auth/login/             # Trang đăng nhập (standalone, không có sidebar)
│   │   ├── main-layout/            # Layout shell: sidebar + header + router-outlet
│   │   ├── dashboard/              # Dashboard (child của main-layout)
│   │   └── vehicles/               # Quản lý xe CRUD (child của main-layout)
│   ├── shared/                     # Components dùng chung
│   │   └── components/
│   │       ├── header/             # Topbar: breadcrumb trái + user dropdown phải
│   │       ├── sidebar/            # Sidebar collapsible với nav + user footer
│   │       └── loading-spinner/    # Spinner overlay
│   ├── app.config.ts               # Root providers: HttpClient, Toastr, Router
│   ├── app.routes.ts               # Route tree (layout-based)
│   ├── app.routes.server.ts        # SSR config: RenderMode.Client cho tất cả routes
│   ├── app.ts                      # Root component
│   └── app.html                    # <router-outlet /> only
└── styles.css                      # Global dark theme + Inter font + Toastr override
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

---

## Route Structure (Layout-based)

Route được tổ chức theo layout shell — tất cả trang protected đều là **children** của `MainLayoutComponent`:

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Standalone — không cần auth, không có sidebar
  { path: 'login', loadComponent: () => import('./features/auth/login/...') },

  // Protected — bọc trong MainLayoutComponent (sidebar + header)
  {
    path: '',
    loadComponent: () => import('./features/main-layout/main-layout.component')
      .then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/...') },
      { path: 'vehicles',  loadComponent: () => import('./features/vehicles/...') },
      // Thêm module mới vào đây
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
```

> **Khi thêm page mới**: thêm vào `children[]` của layout, **KHÔNG** thêm `canActivate: [authGuard]` ở route con vì parent đã guard rồi.

---

## Authentication Flow

1. User vào `/` → redirect `/dashboard` → `authGuard` kiểm tra
2. `authGuard` check `isPlatformBrowser` (tránh SSR context)
3. Check `auth.isAuthenticated()` → nếu true, pass
4. Fallback: check `tokenStorage.getToken()` trực tiếp → nếu có token, pass
5. Không có token → redirect `/login`
6. Login form → `AuthService.login()` → `POST /auth/login`
7. Token + user lưu vào Cookie qua `TokenStorageService`
8. `MainLayoutComponent.ngOnInit()` → `authService.tryLoadUser()` (phòng trường hợp user cookie mất)
9. `auth.interceptor.ts` tự gắn `Authorization: Bearer <token>` vào mọi request
10. 401 → tự gọi `POST /auth/refresh-token` → retry request gốc
11. Refresh thất bại → clear cookie → redirect `/login`

---

## ⚠️ SSR Gotchas — ĐỌC KỸ

Dự án dùng Angular Universal (SSR) nhưng **tất cả routes dùng `RenderMode.Client`**. Không được thay đổi điều này.

```typescript
// app.routes.server.ts — KHÔNG đổi sang Prerender
export const serverRoutes: ServerRoute[] = [
  { path: '**', renderMode: RenderMode.Client }
];
```

**Tại sao**: Cookie (`ngx-cookie-service`) không đọc được server-side → nếu dùng `Prerender`, guard sẽ redirect về `/login` trên server và user bị đăng xuất mỗi khi F5.

**Tuyệt đối không**:
- ❌ Không dùng `provideClientHydration()` (đã bị bỏ)
- ❌ Không dùng `APP_INITIALIZER` để gọi `checkAuth()` (destructive — xóa cookie nếu API fail)
- ❌ Không đọc `document`, `localStorage`, `window` trực tiếp trong service mà không check `isPlatformBrowser`

---

## Toast Notifications — Convention bắt buộc

**TOÀN BỘ thông báo tới user phải dùng `ToastrService`. KHÔNG dùng `alert()`, `confirm()`, `console.log()` cho user feedback.**

### Inject

```typescript
import { ToastrService } from 'ngx-toastr';

export class MyComponent {
  private toastr = inject(ToastrService);
}
```

### Khi nào dùng loại nào

| Method | Tiêu đề gợi ý | Khi nào dùng |
|--------|--------------|--------------|
| `toastr.success(msg, title)` | `'Thành công'` | Tạo/sửa/xóa thành công, login thành công |
| `toastr.error(msg, title)` | `'Lỗi'` | API fail, validation fail, network error |
| `toastr.warning(msg, title)` | `'Cảnh báo'` | Thao tác không được khuyến khích, sắp hết phiên |
| `toastr.info(msg, title)` | `'Thông báo'` | Logout, thông tin trung tính |

### Pattern chuẩn trong feature component

```typescript
// ✅ ĐÚNG
async onSubmit(): Promise<void> {
  try {
    await this.myService.create(payload);
    this.toastr.success('Thêm thành công', 'Thành công');
    this.closeModal();
    await this.loadData();
  } catch (err: any) {
    const msg = err?.error?.message ?? 'Có lỗi xảy ra';
    this.toastr.error(msg, 'Lỗi');
  }
}

async onDelete(): Promise<void> {
  try {
    await this.myService.delete(id);
    this.toastr.success('Đã xóa', 'Thành công');
  } catch (err: any) {
    this.toastr.error(err?.error?.message ?? 'Không thể xóa', 'Lỗi');
  }
}
```

### Cấu hình hiện tại (`app.config.ts`)

```typescript
ToastrModule.forRoot({
  positionClass: 'toast-top-right',
  timeOut: 3000,
  closeButton: true,
  progressBar: true,
  preventDuplicates: true,
})
```

### Custom styles (`styles.css`)

Đã override với dark theme. 4 loại toast: `toast-success`, `toast-error`, `toast-info`, `toast-warning`.
**Không cần thêm style ở component level.**

---

## Patterns & Conventions

### State Management — Angular Signals

```typescript
// Trong service, KHÔNG dùng Subject/BehaviorSubject cho state đơn giản
private _items = signal<Item[]>([]);
private _isLoading = signal(false);

items = this._items.asReadonly();          // expose read-only
isLoading = this._isLoading.asReadonly();
isEmpty = computed(() => this._items().length === 0);
```

### HTTP calls

```typescript
// Dùng firstValueFrom() để convert Observable → Promise trong async methods
const result = await firstValueFrom(this.http.get<T>(url));

// Với query params
let params = new HttpParams();
if (filter.search) params = params.set('search', filter.search);
const result = await firstValueFrom(this.http.get<T>(url, { params }));
```

### Inject pattern (Angular 21)

```typescript
// Ưu tiên dùng inject() function thay vì constructor injection
private myService = inject(MyService);
private toastr = inject(ToastrService);
private router = inject(Router);
```

### Component — Standalone + Lazy Loading

```typescript
@Component({
  selector: 'app-my-feature',
  standalone: true,        // BẮT BUỘC
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-feature.component.html',
  styleUrl: './my-feature.component.css',
})
```

### CSS — Component-scoped

- Mỗi component có file `.css` riêng (scoped)
- Global styles chỉ ở `src/styles.css`
- Dark theme: bg `#0a0f1e`, text `#f1f5f9`, accent `#3b82f6`
- **KHÔNG** dùng inline style ngoài `[style.xxx]` binding

---

## Thêm Module Mới — Checklist

### Bước 1: Model

Tạo `src/app/core/models/ten-entity.model.ts`:
```typescript
export interface TenEntity { _id: string; /* ... */ }
export interface TenEntityCreatePayload { /* required fields */ }
export interface TenEntityUpdatePayload { /* optional fields */ }
export interface TenEntityListResponse {
  success: boolean; count: number; total: number;
  totalPages: number; currentPage: number; data: TenEntity[];
}
```

### Bước 2: Service

Tạo `src/app/core/services/ten-entity.service.ts`:
```typescript
@Injectable({ providedIn: 'root' })
export class TenEntityService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ten-endpoint`;

  async getAll(params = {}): Promise<TenEntityListResponse> {
    return firstValueFrom(this.http.get<TenEntityListResponse>(this.apiUrl, { params }));
  }
  async create(payload: TenEntityCreatePayload) { ... }
  async update(id: string, payload: TenEntityUpdatePayload) { ... }
  async delete(id: string) { ... }
}
```

> Token được tự động gắn bởi `auth.interceptor.ts` — không cần thêm header thủ công.

### Bước 3: Component

Tạo `src/app/features/ten-entity/`:
- `ten-entity.component.ts` — `standalone: true`, inject service + ToastrService
- `ten-entity.component.html` — table + modal + delete confirm
- `ten-entity.component.css` — copy pattern từ `vehicles.component.css`

### Bước 4: Route

Thêm vào `app.routes.ts` trong `children[]` của layout:
```typescript
{
  path: 'ten-entity',
  loadComponent: () => import('./features/ten-entity/ten-entity.component')
    .then(m => m.TenEntityComponent),
}
```

### Bước 5: Sidebar

Thêm nav item vào `sidebar.component.ts`:
```typescript
navItems: NavItem[] = [
  // ...existing items
  { label: 'Tên module', route: '/ten-entity', icon: 'ten-icon' },
];
```

Thêm `@case ('ten-icon')` với SVG tương ứng vào `sidebar.component.html`.

---

## Shared Components

### `<app-header>`
- Topbar: breadcrumb nhỏ bên trái + user dropdown bên phải
- Import: `HeaderComponent` từ `shared/components/header/`

### `<app-sidebar>`
- Sidebar collapsible (click nút mũi tên để thu gọn)
- Tự highlight active route
- Import: `SidebarComponent` từ `shared/components/sidebar/`

### `<app-loading-spinner>`
- Spinner overlay toàn màn hình
- Import: `LoadingSpinnerComponent` từ `shared/components/loading-spinner/`

### `<app-confirm-dialog>` ← **DÙNG CHO MỌI XÁC NHẬN XÓA**

> **Quy tắc**: Mọi thao tác xóa phải có confirm dialog. Dùng `ConfirmDialogComponent` dùng chung — **KHÔNG tự viết inline dialog**.

**File**: `shared/components/confirm-dialog/confirm-dialog.component.ts`

**API:**

| Input | Type | Default | Mô tả |
|-------|------|---------|-------|
| `isOpen` | `boolean` | `false` | Hiện/ẩn dialog |
| `title` | `string` | `'Xác nhận xóa'` | Tiêu đề |
| `message` | `string` | — | Nội dung (hỗ trợ HTML `<strong>`) |
| `confirmLabel` | `string` | `'Xóa'` | Label nút xác nhận |
| `cancelLabel` | `string` | `'Hủy'` | Label nút hủy |
| `isLoading` | `boolean` | `false` | Hiện spinner, disable cả 2 nút |

| Output | Mô tả |
|--------|-------|
| `confirmed` | User nhấn nút xác nhận |
| `cancelled` | User nhấn Hủy hoặc backdrop |

**Usage pattern:**

```typescript
// component.ts
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  imports: [..., ConfirmDialogComponent],
})
export class MyComponent {
  deleteConfirmOpen = signal(false);
  itemToDelete = signal<MyItem | null>(null);
  isDeleting = signal<string | null>(null);

  confirmDelete(item: MyItem): void {
    this.itemToDelete.set(item);
    this.deleteConfirmOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.itemToDelete.set(null);
  }

  async executeDelete(): Promise<void> {
    const item = this.itemToDelete();
    if (!item) return;
    this.isDeleting.set(item._id);
    try {
      await this.myService.delete(item._id);
      this.toastr.success('Đã xóa', 'Thành công');
      this.cancelDelete();
      await this.loadData();
    } catch (err: any) {
      this.toastr.error(err?.error?.message ?? 'Không thể xóa', 'Lỗi');
    } finally {
      this.isDeleting.set(null);
    }
  }
}
```

```html
<!-- component.html -->
<app-confirm-dialog
  [isOpen]="deleteConfirmOpen()"
  [title]="'Xóa item?'"
  [message]="itemToDelete()
    ? 'Bạn có chắc muốn xóa <strong>' + itemToDelete()!.name + '</strong>?<br/>Không thể hoàn tác.'
    : ''"
  confirmLabel="Xóa"
  [isLoading]="!!isDeleting()"
  (confirmed)="executeDelete()"
  (cancelled)="cancelDelete()"
/>
```

---

## CORS

Backend (BE) phải cho phép origin `http://localhost:4200`. Kiểm tra `be/.env`:

```
CORS_ORIGIN=http://localhost:3000,http://localhost:4200
```

Nếu thêm port mới, cập nhật `CORS_ORIGIN` và **restart BE**.
