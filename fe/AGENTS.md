# Angular Frontend — Fleet Management System

## Tổng quan

Frontend Angular 21 cho hệ thống quản lý xe khách, gọi Backend API (`/api/v1`). Backend có tài liệu riêng ở [`../be/AGENTS.md`](../be/AGENTS.md).

- **Framework**: Angular 21 (Standalone Components, chạy thuần client — SSR đã tắt khi build)
- **Styling**: Tailwind CSS v4 + Vanilla CSS (component-scoped)
- **HTTP Client**: Angular `HttpClient` (built-in)
- **State**: Angular **Signals** (built-in, không dùng thư viện ngoài)
- **Cookie**: `ngx-cookie-service`
- **Toast**: `ngx-toastr` ← **TOÀN BỘ thông báo user dùng toast, KHÔNG dùng alert()**
- **Dev server**: `http://localhost:4200`
- **Deploy**: Netlify (`../netlify.toml`) — xem [Deploy](#deploy)

---

## Khởi động

```bash
npm install
npm start          # → http://localhost:4200 (HMR)
npm run build      # production → dist/bus-management/browser
```

> ⚠️ **Yêu cầu**: Backend phải chạy tại `http://localhost:5000` trước. Nên chạy BE bằng `npm run dev` (nodemon) — chạy `node src/server.js` thì sửa code BE xong phải tự restart.

---

## Cấu trúc thư mục

```
src/
├── environments/
│   ├── environment.ts                 # API URL khi dev (localhost:5000)
│   └── environment.production.ts      # API URL production (Render) — thay qua fileReplacements
├── app/
│   ├── core/                          # Singleton: services, guards, interceptors, models
│   │   ├── constants/permissions.ts   # Nhãn tiếng Việt cho role/permission (dùng chung)
│   │   ├── guards/
│   │   │   ├── auth.guard.ts          # Chưa đăng nhập → /login
│   │   │   └── permission.guard.ts    # Thiếu quyền → /dashboard + toast
│   │   ├── interceptors/auth.interceptor.ts  # Gắn Bearer token + tự refresh khi 401
│   │   ├── models/                    # auth, booking, dashboard, driver, itinerary, role, route, seat, trip, vehicle
│   │   └── services/                  # auth, token-storage + 1 service / resource
│   ├── features/                      # Trang lazy-load (con của main-layout, trừ login)
│   │   ├── auth/login/
│   │   ├── main-layout/               # Shell: sidebar + header + router-outlet
│   │   ├── dashboard/  vehicles/  drivers/  routes/  trips/
│   │   ├── bookings/                  # Đặt vé 1 chuyến
│   │   ├── itineraries/               # Hành trình nhiều chặng (nhiều booking)
│   │   ├── maintenance/               # Lịch bảo dưỡng & đăng kiểm (quyền maintenance:*)
│   │   ├── users/                     # Quản lý tài khoản: tạo, đổi role, khóa/mở khóa, xóa (chỉ admin)
│   │   ├── roles/                     # Ma trận phân quyền (chỉ admin)
│   │   └── profile/                   # Hồ sơ của tôi (mở từ menu avatar)
│   ├── shared/components/
│   │   ├── header/  sidebar/  loading-spinner/
│   │   ├── confirm-dialog/  action-menu/  search-input/  add-button/
│   │   └── seat-map/                  # Sơ đồ ghế xe + seat-layout.ts
│   ├── app.config.ts                  # Root providers: HttpClient, Toastr, Router
│   └── app.routes.ts                  # Route tree (layout-based)
└── styles.css                         # Global dark theme + Inter font + Toastr override
```

---

## Environment / Config

Không dùng `.env` và **không đọc biến môi trường lúc chạy** — URL API được build sẵn vào bundle:

| File | Dùng khi | `apiUrl` |
|---|---|---|
| `environment.ts` | `npm start`, `ng build --configuration development` | `http://localhost:5000/api/v1` |
| `environment.production.ts` | `npm run build` (mặc định production) | URL Render của backend |

Đổi URL backend production = sửa `environment.production.ts` rồi push (Netlify tự build lại). Thêm biến môi trường trên Netlify **không có tác dụng**.

---

## Route Structure (Layout-based)

Mọi trang cần đăng nhập là **children** của `MainLayoutComponent` (parent đã có `authGuard`):

```typescript
// app.routes.ts
const requires = (resource: string, action = 'read') => ({
  canActivate: [permissionGuard],
  data: { permission: { resource, action } },
});

children: [
  { path: 'dashboard', loadComponent: ... },                         // ai cũng vào được
  { path: 'drivers',   loadComponent: ..., ...requires('drivers') }, // cần drivers:read
  { path: 'itineraries', loadComponent: ..., ...requires('bookings') }, // dùng quyền bookings như BE
  { path: 'profile',   loadComponent: ... },                         // ai cũng vào được
  { path: 'roles',     loadComponent: ..., canActivate: [permissionGuard], data: { adminOnly: true } },
]
```

> **KHÔNG** thêm `authGuard` ở route con. Trang nghiệp vụ mới **phải** có `...requires(...)` — xem [Phân quyền](#phân-quyền-rbac).

---

## Authentication Flow

1. `authGuard`: có token (signal hoặc cookie) → cho qua; không có → `/login`
2. Login → `POST /auth/login` → lưu `token`, `refreshToken`, `user` vào cookie (`TokenStorageService`)
3. Điều hướng sau login do `effect` trong `LoginComponent` lo (khi `isAuthenticated()` thành `true`) — **không** thêm `navigate` thứ hai trong `onSubmit`
4. `MainLayoutComponent.ngOnInit()` → `authService.refreshUser()`: luôn gọi lại `GET /auth/me` để nhận quyền mới nhất (admin đổi quyền → user chỉ cần F5)
5. `auth.interceptor.ts` gắn `Authorization: Bearer <token>`; gặp **401** → `POST /auth/refresh-token` → retry
6. Refresh thất bại → xóa cookie → `/login`

### ⚠️ Gotchas về token / cookie

- **Refresh token được xoay vòng**: mỗi lần refresh, BE trả `{ token, refreshToken }` mới và **hủy refresh token cũ** → phải lưu cả hai (`refreshAccessToken()`). Quên lưu refresh token mới = user bị đá ra sau ~2 giờ.
- **Logout phải gửi `{ refreshToken }`** của thiết bị hiện tại. Body rỗng → BE xóa refresh token của **mọi thiết bị**.
- **Cookie tối đa ~4KB**: user đầy đủ của admin (~8KB) bị trình duyệt bỏ qua âm thầm. `TokenStorageService.setUser()` chỉ lưu bản gọn (permission chỉ còn `resource` + `action`). **Không** nhét thêm dữ liệu lớn vào cookie.
- **Mọi lỗi 401 đều bị interceptor hiểu là hết phiên** → BE trả **400** cho lỗi nghiệp vụ (vd. sai mật khẩu hiện tại khi đổi mật khẩu).
- Không dùng `APP_INITIALIZER` để gọi `checkAuth()` (xóa cookie nếu API lỗi). Dùng `refreshUser()` / `tryLoadUser()` (lỗi thì giữ nguyên user cũ).
- Không đọc `document` / `localStorage` / `window` trong service mà không check `isPlatformBrowser` (code vẫn còn file SSR `app.routes.server.ts`, `server.ts` dù build hiện tại không bật SSR).

---

## Phân quyền (RBAC)

Quyền có dạng `resource:action` (vd. `drivers:read`, `trips:update`), gắn vào **role**. FE ẩn/hiện theo **đúng** quyền mà BE kiểm tra (`checkPermission(resource, action)`); BE vẫn là nơi chặn thật.

| Công cụ | Dùng ở đâu |
|---|---|
| `auth.can(resource, action)` | Mọi chỗ cần kiểm tra quyền. **Admin luôn `true`** (giống BE bỏ qua kiểm tra với admin) |
| `auth.isAdmin()` | Trang/endpoint BE dùng `authorize('admin')` (users, roles, permissions) — không dựa vào permission |
| `permissionGuard` + `data.permission` / `data.adminOnly` | Chặn gõ URL trực tiếp → về `/dashboard` + toast |
| `NavItem.permission` / `NavItem.adminOnly` | Ẩn mục sidebar (`visibleNavItems`) |
| `allowCreate/allowUpdate/allowDelete` (computed trong component) | Ẩn nút Thêm, mục Sửa/Xóa trong action menu, nút trong modal |

Pattern trong feature component:

```typescript
private auth = inject(AuthService);

// Hide actions the backend would reject with 403
readonly allowCreate = computed(() => this.auth.can('drivers', 'create'));
readonly allowUpdate = computed(() => this.auth.can('drivers', 'update'));
readonly allowDelete = computed(() => this.auth.can('drivers', 'delete'));

getActions(d: Driver): MenuAction[] {
  return [
    { label: 'Xem chi tiết', iconPaths: this.EYE, action: () => this.openViewModal(d) },
    ...(this.allowUpdate() ? [{ label: 'Chỉnh sửa', iconPaths: this.EDIT, color: 'warning' as const, action: () => this.openEditModal(d) }] : []),
  ];
}
```

```html
@if (allowCreate()) {
  <app-add-button buttonId="add-driver-btn" label="Thêm Tài Xế" (clicked)="openCreateModal()" />
}
```

Lưu ý:
- **Không gọi API mà user không có quyền** chỉ để đổ dropdown — sẽ ra toast lỗi 403. Vd. trang Chuyến đi chỉ tải tuyến/xe/tài xế khi `allowCreate() || allowUpdate()`.
- Thêm nhãn cho quyền mới trong `core/constants/permissions.ts` (dùng chung cho trang Phân quyền và Hồ sơ).
- Trang **Phân quyền** (`/roles`, admin) sửa quyền của role qua `PUT /roles/:id`. Role chỉ có 4 giá trị cố định (`admin, manager, staff, user` — enum ở BE), không tạo/xóa role mới được.

---

## Toast Notifications — Convention bắt buộc

**TOÀN BỘ thông báo tới user phải dùng `ToastrService`. KHÔNG dùng `alert()`, `confirm()`, `console.log()` cho user feedback.**

| Method | Tiêu đề gợi ý | Khi nào dùng |
|--------|--------------|--------------|
| `toastr.success(msg, title)` | `'Thành công'` | Tạo/sửa/xóa thành công, login thành công |
| `toastr.error(msg, title)` | `'Lỗi'` | API fail, validation fail, network error |
| `toastr.warning(msg, title)` | `'Cảnh báo'` | Thao tác không được khuyến khích, thiếu quyền |
| `toastr.info(msg, title)` | `'Thông báo'` | Logout, thông tin trung tính |

### Pattern chuẩn

BE trả lỗi dạng `{ success: false, error: "..." }` → message nằm ở **`err.error.error`** (không phải `err.error.message`):

```typescript
async onSubmit(): Promise<void> {
  try {
    await this.myService.create(payload);
    this.toastr.success('Thêm thành công', 'Thành công');
    this.closeModal();
    await this.loadData();
  } catch (err: any) {
    this.toastr.error(err?.error?.error ?? err?.message ?? 'Có lỗi xảy ra', 'Lỗi');
  }
}
```

Toast dùng dark theme override trong `styles.css` — không cần style ở component.

---

## Patterns & Conventions

### State — Angular Signals

```typescript
private _items = signal<Item[]>([]);
items = this._items.asReadonly();
isEmpty = computed(() => this._items().length === 0);
```

### HTTP calls

```typescript
const result = await firstValueFrom(this.http.get<T>(url, { params }));
```

### Inject (Angular 21)

Ưu tiên `inject()` thay vì constructor injection.

### Component — Standalone + Lazy Loading

```typescript
@Component({
  selector: 'app-my-feature',
  standalone: true,        // BẮT BUỘC
  imports: [CommonModule, FormsModule],
  templateUrl: './my-feature.component.html',
  styleUrl: './my-feature.component.css',
})
```

### CSS — Component-scoped

- Mỗi component có file `.css` riêng; global chỉ ở `src/styles.css`
- Dark theme: bg `#0a0f1e`, text `#f1f5f9`, accent `#3b82f6`
- Trang dạng bảng + modal có thể **dùng lại** CSS của Bookings thay vì copy: `styleUrls: ['../bookings/bookings.component.css', './my-feature.component.css']` (itineraries, roles, profile đang làm vậy) — file riêng chỉ chứa phần khác biệt
- **KHÔNG** dùng inline style ngoài `[style.xxx]` binding
- Layout shell (`main-layout`) cố định theo chiều cao màn hình; chỉ `.shell-content` cuộn → `position: sticky` trong trang bám theo vùng nội dung, không theo `window`

---

## Thêm Module Mới — Checklist

1. **Model** — `core/models/ten-entity.model.ts` (entity, create/update payload, list response)
2. **Service** — `core/services/ten-entity.service.ts` (`inject(HttpClient)`, `firstValueFrom`; token tự gắn bởi interceptor)
3. **Component** — `features/ten-entity/` (`standalone: true`, table + modal + `ConfirmDialogComponent` khi xóa)
4. **Route** — thêm vào `children[]` trong `app.routes.ts`
5. **Sidebar** — thêm `NavItem` trong `sidebar.component.ts` + `@case ('icon')` SVG trong `sidebar.component.html`; thêm tiêu đề trong `pageTitle` của `header.component.ts`
6. **Phân quyền** ← **đừng quên**
   - Route: `...requires('ten-resource')` (hoặc `data: { adminOnly: true }`)
   - Sidebar: `permission: { resource: 'ten-resource', action: 'read' }`
   - Component: `allowCreate/allowUpdate/allowDelete` để ẩn nút
   - BE: route phải có `checkPermission('ten-resource', ...)` và permission phải được seed (`be/src/config/seedRolesPermissions.js`)
   - Nhãn tiếng Việt: `core/constants/permissions.ts`

---

## Shared Components

### `<app-header>` / `<app-sidebar>` / `<app-loading-spinner>`
- Header: tiêu đề trang (theo URL) bên trái, menu avatar bên phải (**Hồ sơ của tôi**, **Đăng xuất**)
- Sidebar: collapsible, tự highlight route, chỉ hiện mục user có quyền

### `<app-confirm-dialog>` ← **DÙNG CHO MỌI XÁC NHẬN XÓA**

| Input | Type | Default | Mô tả |
|-------|------|---------|-------|
| `isOpen` | `boolean` | `false` | Hiện/ẩn |
| `title` | `string` | `'Xác nhận xóa'` | Tiêu đề |
| `message` | `string` | — | Nội dung (hỗ trợ `<strong>`) |
| `confirmLabel` / `cancelLabel` | `string` | `'Xóa'` / `'Hủy'` | Label nút |
| `isLoading` | `boolean` | `false` | Spinner, disable 2 nút |

Outputs: `confirmed`, `cancelled`.

```html
<app-confirm-dialog
  [isOpen]="deleteConfirmOpen()"
  title="Xóa item?"
  [message]="itemToDelete() ? 'Xóa <strong>' + itemToDelete()!.name + '</strong>?' : ''"
  [isLoading]="!!isDeleting()"
  (confirmed)="executeDelete()"
  (cancelled)="cancelDelete()"
/>
```

### `SearchInputComponent` — `shared/components/search-input/`

Bắt buộc dùng thay vì tự viết ô tìm kiếm. Inputs: `placeholder`, `value`, `inputId`; output: `search`.
- Vehicles / Drivers / Routes / Bookings / Itineraries: search **server-side**
- Trips: **client-side** (`/trips` không có param `search`) → render `filteredTrips()`

### `ActionMenuComponent` — `shared/components/action-menu/`

Menu ⋮ cho cột "Thao Tác". Input: `actions: MenuAction[]`.

```typescript
export interface MenuAction {
  label: string;
  iconPaths: string[];   // SVG path(s)
  color?: 'default' | 'warning' | 'danger' | 'success' | 'info';
  disabled?: boolean;
  action: () => void;
}
```

> ⚠️ **TS2322**: khi lọc/spread array literal, `color` bị widen thành `string` → khai báo `const all: MenuAction[] = [...]` hoặc dùng `'warning' as const`.

### `AddButtonComponent` — `shared/components/add-button/`

Nút thêm mới ở header trang. Inputs: `label`, `buttonId`; output: `clicked`. Bọc trong `@if (allowCreate())`.

### `<app-seat-map>` — `shared/components/seat-map/`

Sơ đồ ghế theo bố cục xe thật, dùng cho form Đặt vé và từng chặng của form Hành trình.

| Input/Output | Kiểu | Mô tả |
|---|---|---|
| `seats` | `Seat[]` | **Tất cả** ghế của chuyến (mọi status) — gọi `getSeatMap(tripId)` **không** truyền `'available'` |
| `selectedId` | `string` | Ghế đang chọn |
| `fare` | `number?` | Giá hiển thị ở dòng tóm tắt |
| `readonly` | `boolean` | Chỉ xem, không chọn được (dùng trong Chi tiết chuyến) |
| `selectedIdChange` | `string` | Emit id ghế; `''` khi bỏ chọn |

- Chỉ ghế `available` bấm được; ghế `reserved` / `booked` / `unavailable` hiển thị nhưng bị khóa
- Bố cục suy ra từ số ghế (seatNumber lớn nhất = sức chứa): ≤ 16 ghế `1 | lối đi | 2`, còn lại `2 | lối đi | 2`, ghế lẻ cuối nhập vào hàng cuối
- ⚠️ `seat-layout.ts` **phải giữ đồng bộ** với `be/src/utils/seatLayout.js` (BE dùng để gán loại ghế `priority/window/aisle` theo vị trí)

---

## Thông báo (chuông trên header)

- Dữ liệu thật từ `GET /notifications` (BE tính khi gọi, đã lọc theo quyền) qua `NotificationService` — **không** có dữ liệu mẫu trong component.
- Làm mới khi mở app, mỗi 5 phút, khi mở chuông, và sau thao tác làm thay đổi cảnh báo (vd. trang Bảo dưỡng gọi `notificationService.refresh()`).
- "Đã đọc" lưu ở `localStorage` (`fleet.notifications.read`, theo trình duyệt). `id` cảnh báo đổi khi tình huống đổi → hiện lại là chưa đọc. Cảnh báo tự biến mất khi vấn đề được xử lý.
- Bấm cảnh báo → đánh dấu đã đọc + điều hướng tới `link`.

## Dashboard

- Mọi phần của `DashboardData` là optional: BE bỏ phần user không có quyền → template dùng `@if (section(); as x)` và **ẩn** thay vì hiện 0.
- Thẻ KPI có so sánh với hôm qua; "Lịch chạy hôm nay" tô nổi chuyến đang chạy / sắp khởi hành trong 60 phút; "Cần xử lý" lấy 5 cảnh báo đầu từ `NotificationService`.
- Biểu đồ 7 ngày là HTML/CSS thuần (không thư viện): một chuỗi số liệu (doanh thu đã xác nhận), tooltip khi hover/focus, kèm bảng ẩn cho screen reader. Không vẽ trục kép — số vé / chờ xác nhận nằm trong tooltip.
- Tự làm mới mỗi 2 phút.

## Hạn dùng (bằng lái, đăng kiểm)

`core/utils/expiry.ts`: `validUntilEndOfDay`, `expiryDaysLeft`, `expiryStatus`, `expiryLabel` — cùng quy tắc "còn hiệu lực hết ngày" như BE. Dùng cho nhãn ở trang Tài xế / Xe và cảnh báo trong form Chuyến đi (xe đang bảo dưỡng hoặc hết đăng kiểm trong khung giờ bị khóa trong dropdown).

## Module: Bookings, Seats & Itineraries

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/bookings` | Tạo booking 1 chuyến (seat → `reserved`) |
| `GET` | `/bookings` | Danh sách; filter `tripId`, `status`, `search` |
| `PATCH` | `/bookings/:id/confirm` · `/cancel` | Xác nhận (seat → `booked`) · Hủy (seat → `available`) |
| `DELETE` | `/bookings/:id` | Chỉ booking `cancelled` |
| `POST` | `/itineraries` | Hành trình ≥ 2 chặng, giữ ghế mọi chặng trong 1 transaction |
| `GET` | `/itineraries/:id` | Kèm `connections[]` + `atRisk` (tính lại theo giờ trễ hiện tại) |
| `PATCH` | `/itineraries/:id/confirm` · `/cancel` | Áp dụng cho **tất cả** chặng |
| `GET` | `/seats?tripId=` | Sơ đồ ghế (mọi status) |
| `POST` | `/seats/initialize` | Khởi tạo ghế cho chuyến mới (type theo vị trí) |

- Booking thuộc hành trình (`booking.itinerary`) **không** được confirm/cancel/xóa lẻ qua `/bookings` (BE trả 400) → FE ẩn các nút đó, gắn nhãn "Hành trình"
- Form hành trình lọc sẵn chuyến cho chặng sau: xuất phát đúng điểm đến chặng trước, sau ≥ 30 phút (`MIN_TRANSFER_MINUTES` — hằng số trong `itineraries.component.ts` phải khớp BE)

---

## Deploy

- **Frontend**: Netlify, cấu hình ở `../netlify.toml` (base `fe`, `npm run build`, publish `dist/bus-management/browser`, Node 22, SPA redirect `/* → /index.html`). Push lên `main` → Netlify tự build (~30s).
- **Backend**: Render — URL nằm trong `environment.production.ts`. BE phải có `CORS_ORIGIN` chứa domain Netlify.
- Gói free của Render "ngủ" sau 15 phút → request đầu tiên mất ~50s. Mở trang trước khi demo.

### CORS khi dev

`be/.env` phải cho phép `http://localhost:4200` (`CORS_ORIGIN`, nhiều origin cách nhau bằng dấu phẩy). Sửa xong phải restart BE.
