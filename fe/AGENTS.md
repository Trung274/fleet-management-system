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

---

## Shared UI Components

### `SearchInputComponent` — `shared/components/search-input/`

Thanh tìm kiếm dùng chung cho tất cả các trang. **Bắt buộc sử dụng thay vì viết inline search box**.

**API:**
| Input/Output | Kiểu | Mô tả |
|---|---|---|
| `@Input() placeholder` | `string` | Placeholder text |
| `@Input() value` | `string` | Giá trị hiện tại (bind từ signal) |
| `@Input() inputId` | `string` | ID của `<input>` để label/test targeting |
| `@Output() search` | `EventEmitter<string>` | Emit khi user gõ hoặc bấm nút xóa |

**Cách dùng:**
```html
<app-search-input
  inputId="vehicle-search"
  placeholder="Tìm theo biển số..."
  [value]="searchQuery()"
  (search)="onSearch($event)"
/>
```

**Lưu ý:**
- Search của **Vehicles / Drivers / Routes** gọi API (server-side, có debounce qua `loadXxx()`).
- Search của **Trips** là **client-side filter** vì backend `/trips` không có param `search`. Dùng `computed(() => trips().filter(...))` và render `filteredTrips()` thay vì `trips()` trong template.
- Component tự bao gồm nút "×" để xóa query, không cần xử lý thêm ở parent.

---

### `ActionMenuComponent` — `shared/components/action-menu/`

Menu ba chấm (⋮) dùng chung cho cột "Thao Tác" trong bảng. **Bắt buộc sử dụng thay vì render nhiều icon button riêng lẻ**.

**API:**
| Input | Kiểu | Mô tả |
|---|---|---|
| `@Input() actions` | `MenuAction[]` | Danh sách action items |

**Interface `MenuAction`:**
```typescript
export interface MenuAction {
  label: string;
  iconPaths: string[];   // SVG <path d="..."> — hỗ trợ nhiều path (eye = 2 paths)
  color?: 'default' | 'warning' | 'danger' | 'success' | 'info';
  disabled?: boolean;
  action: () => void;
}
```

**Cách dùng:**
```typescript
// Trong component TS — khai báo icon paths là readonly class fields
readonly EYE   = ['M2.036 12.322...', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'];
readonly EDIT  = ['M16.862 4.487...'];
readonly TRASH = ['M14.74 9l-.346 9...'];

getActions(item: MyModel): MenuAction[] {
  const all: MenuAction[] = [   // ← BẮT BUỘC type rõ ràng để tránh TS2322
    { label: 'Xem chi tiết', iconPaths: this.EYE,   action: () => this.openView(item) },
    { label: 'Chỉnh sửa',   iconPaths: this.EDIT,  color: 'warning', action: () => this.openEdit(item) },
    { label: 'Xóa',         iconPaths: this.TRASH, color: 'danger',  action: () => this.confirmDelete(item) },
  ];
  return all; // hoặc all.filter(...) nếu cần ẩn item theo điều kiện
}
```

```html
<!-- Trong template -->
<td style="text-align:right; padding-right:.75rem">
  <app-action-menu [actions]="getActions(item)" />
</td>
```

> ⚠️ **TS2322 Gotcha**: Khi dùng `.filter()` trên array literal, TypeScript widening `color` thành `string`. Fix bằng cách khai báo `const all: MenuAction[] = [...]` trước khi `.filter()`.

---

### `AddButtonComponent` — `shared/components/add-button/`

Nút thêm mới (gradient xanh, icon +) dùng chung ở header của mọi trang. **Bắt buộc sử dụng thay vì viết inline button**.

**API:**
| Input/Output | Kiểu | Mô tả |
|---|---|---|
| `@Input() label` | `string` | Text hiển thị trong button (default: `'Thêm mới'`) |
| `@Input() buttonId` | `string` | `id` attribute của button (dùng cho e2e test) |
| `@Output() clicked` | `EventEmitter<void>` | Emit khi click |

**Cách dùng:**
```html
<app-add-button
  buttonId="add-vehicle-btn"
  label="Thêm xe mới"
  (clicked)="openCreate()"
/>
```

**Lưu ý:**
- Style gradient (`#3b82f6 → #6366f1`) được đóng gói trong component, không phụ thuộc vào CSS của trang cha.
- Đặt bên trong `<div class="page-header">` cạnh khối tiêu đề trang (`.page-title` / `.page-subtitle`).

---

## Module: Bookings & Seats

### Files

| File | Mục đích |
|---|---|
| `core/models/booking.model.ts` | Booking, BookingPassenger, BookingCreatePayload, BookingCancelPayload |
| `core/models/seat.model.ts` | Seat, SeatAvailability, SeatStatus, SeatType |
| `core/services/booking.service.ts` | CRUD + confirm/cancel lifecycle |
| `core/services/seat.service.ts` | getSeatMap, getAvailability, initializeSeats, updateStatus |
| `features/bookings/bookings.component.ts` | Full component với Signals state |
| `features/bookings/bookings.component.html` | Table + create modal + view modal + cancel dialog |
| `features/bookings/bookings.component.css` | Dark theme + seat grid picker |

### API Endpoints (Backend `/api/v1`)

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/bookings` | Tạo booking (seat → reserved) |
| `GET` | `/bookings` | Danh sách, filter: `tripId`, `status`, `search`, pagination |
| `GET` | `/bookings/:id` | Chi tiết booking (populated) |
| `PATCH` | `/bookings/:id/confirm` | Xác nhận booking (seat → booked) |
| `PATCH` | `/bookings/:id/cancel` | Hủy booking (seat → available), body: `{ reason }` |
| `DELETE` | `/bookings/:id` | Xóa booking (Admin only) |
| `GET` | `/seats/availability?tripId=` | Tóm tắt khả dụng ghế (public) |
| `GET` | `/seats?tripId=&status=` | Sơ đồ ghế đầy đủ (auth) |
| `POST` | `/seats/initialize` | Khởi tạo ghế cho chuyến (Manager) |
| `PATCH` | `/seats/:id` | Cập nhật trạng thái ghế (chỉ `available`/`unavailable`) |

### Business Logic

- **Booking lifecycle**: `pending` → `confirmed` (Xác nhận) | `pending/confirmed` → `cancelled` (Hủy)
- **Seat lifecycle**: khi booking pending → seat `reserved`; confirmed → `booked`; cancelled → `available`
- **Seat picker**: Khi chọn chuyến đi trong modal tạo, component gọi `getSeatMap(tripId, 'available')` để hiển thị grid ghế trống. Ghế được chọn highlight bằng class `selected`.
- **Chỉ xóa được booking ở trạng thái `cancelled`**
- **Search server-side**: Bookings hỗ trợ `search` param (tìm theo `passenger.name` hoặc `passenger.phone`)

### Design Notes
- Seat grid picker hiển thị ghế có màu theo type: `standard` (mặc định), `window` (xanh), `aisle` (tím), `priority` (vàng)
- Status banner trong view modal đổi màu theo trạng thái booking
- Sử dụng đầy đủ shared components: `AddButtonComponent`, `SearchInputComponent`, `ActionMenuComponent`, `ConfirmDialogComponent`
