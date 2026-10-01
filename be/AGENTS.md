# Backend — Fleet Management System

Node.js + Express 4 + MongoDB (Mongoose 8). REST API tại `/api/v1`, Swagger tại `/api-docs`.
Frontend có tài liệu riêng ở [`../fe/AGENTS.md`](../fe/AGENTS.md).

---

## Khởi động

```bash
npm install
npm run dev        # nodemon — tự restart khi sửa code (port 5000)
npm start          # node thường — sửa code xong phải tự restart
npm test           # jest --coverage  ⚠️ chạy trên DB thật, xem phần Test
npm run seed:all   # ⚠️ XÓA toàn bộ dữ liệu rồi seed lại
```

Tài khoản seed: `admin@example.com / Admin@123`, `manager@example.com / Manager@123`, `staff@example.com / Staff@123`, `nguyen.an@example.com / User@1234` (role `user`).

---

## Cấu trúc

```
src/
├── server.js            # Express app: helmet, CORS, rate limit, trust proxy, routes, errorHandler
├── config/              # database.js, swagger.js, seed*.js
├── controllers/         # Logic theo resource
├── middleware/
│   ├── auth.js          # protect, checkPermission(resource, action), authorize(...roles)
│   └── errorHandler.js  # Chuẩn hóa lỗi → { success: false, error }
├── models/              # Mongoose schemas
├── routes/              # Router + Swagger JSDoc (swagger đọc ./src/routes/*.js)
├── utils/
│   ├── asyncHandler.js  ErrorResponse (errorResponse.js)
│   └── seatLayout.js    # Bố cục ghế theo sức chứa — đồng bộ với fe/.../seat-map/seat-layout.ts
└── tests/               # Jest + supertest, mỗi file tự dựng mini Express app
openspec/                # Spec/proposal theo từng tính năng (quy trình OpenSpec)
docs/                    # TEST_REPORT_* sinh bởi `npm run test:report`
```

---

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|
| `MONGODB_URI` | ✅ | — | Atlas (replica set — cần cho transaction của hành trình) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ | — | Hai giá trị khác nhau |
| `JWT_EXPIRE`, `JWT_REFRESH_EXPIRE` | ✅ | — | vd. `1h`, `7d` |
| `NODE_ENV` | | — | `production` để không trả stack trace |
| `PORT` | | `5000` | Render tự cấp, không đặt trên Render |
| `CORS_ORIGIN` | | `*` | Danh sách origin, phân tách bằng dấu phẩy (domain Netlify + `http://localhost:4200`) |
| `API_VERSION` | | `v1` | |
| `API_URL` | | `http://localhost:PORT` | Server hiển thị trong Swagger |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | | `900000`, `100` | Áp cho `/api/` |
| `DRIVER_REST_MINUTES` | | `30` | Thời gian nghỉ tối thiểu giữa 2 chuyến của 1 tài xế |
| `MIN_TRANSFER_MINUTES` | | `30` | Thời gian chuyển xe tối thiểu giữa 2 chặng (FE có hằng số tương ứng) |
| `TZ` | | giờ server | Đặt `Asia/Ho_Chi_Minh` trên Render để hạn bằng lái tính đúng ngày VN |

`app.set('trust proxy', 1)` đã bật — cần cho rate limit theo IP thật khi chạy sau proxy (Render).

---

## Conventions

### Lỗi
- Throw/next `new ErrorResponse(message, statusCode)`; bọc controller bằng `asyncHandler`.
- Response lỗi luôn là `{ success: false, error: "<message>" }` (FE đọc `err.error.error`).
- **Không trả 401 cho lỗi nghiệp vụ** (vd. sai mật khẩu hiện tại) — FE coi mọi 401 là hết phiên và tự refresh/đăng xuất. Dùng 400.
- Lỗi do đồng thời (ghế vừa bị người khác giữ) → 409.

### Phân quyền
- Route nghiệp vụ: `protect` + `checkPermission('resource', 'action')`. **Admin bỏ qua mọi checkPermission.**
- `users`, `roles`, `permissions` dùng `authorize('admin')` (theo **tên role**, không theo permission).
- Endpoint đọc danh sách cũng phải có `checkPermission(..., 'read')` — FE ẩn menu theo quyền `read`, BE phải chặn tương ứng.
- Role có enum cố định `admin | manager | staff | user`. Permission mới → thêm vào `seedRolesPermissions.js` và nhãn tiếng Việt ở `fe/src/app/core/constants/permissions.ts`.
- Đổi quyền của role có hiệu lực ngay ở BE (`protect` load lại user + role mỗi request).

### Auth / phiên đăng nhập
- `POST /auth/refresh-token` **xoay vòng** refresh token: trả token mới, hủy token cũ.
- `POST /auth/logout` với `{ refreshToken }` chỉ kết thúc phiên đó; **body rỗng = đăng xuất mọi thiết bị**.
- `PUT /auth/change-password`: kiểm tra mật khẩu cũ, đổi qua `user.save()` (để chạy hook bcrypt), set `passwordChangedAt` (access token cũ bị `protect` từ chối), chỉ giữ refresh token mới của thiết bị hiện tại.
- ⚠️ Không cập nhật `password` bằng `findByIdAndUpdate` — bỏ qua hook `pre('save')` nên mật khẩu bị lưu dạng thô.

### Đồng thời & giao dịch
- Giữ ghế bằng update có điều kiện: `Seat.findOneAndUpdate({ _id, trip, status: 'available' }, { status: 'reserved' })` — người đến sau nhận `null` → 409.
- Hành trình nhiều chặng (`itinerary.controller.js`) dùng `mongoose.connection.transaction()` — chặng nào lỗi thì hoàn tác tất cả. Cần MongoDB replica set (Atlas có sẵn; MongoDB standalone ở local sẽ lỗi).

---

## Quy tắc nghiệp vụ

| Quy tắc | Nơi kiểm tra |
|---|---|
| Xe không trùng lịch | `trip.controller.js` — `checkVehicleAvailability` |
| Tài xế không trùng lịch **và** nghỉ ≥ `DRIVER_REST_MINUTES` giữa 2 chuyến | `checkDriverAvailability` (tạo/đổi tài xế/đổi giờ) |
| Bằng lái còn hiệu lực đến **hết ngày hết hạn** và phải bao trọn tới giờ đến của chuyến (cả chuyến qua đêm) | `checkLicenseCoversTrip` khi tạo, đổi tài xế/giờ đến, và khi `/start` (tính cả thời gian trễ) |
| Ngày hết hạn bằng lái = **ngày UTC** của `licenseExpiry` (FE gửi `YYYY-MM-DD`), kết thúc ngày theo giờ server | `licenseValidUntil` |
| Chặng sau của hành trình xuất phát đúng điểm đến chặng trước (so khớp tên, không phân biệt hoa thường) và sau ≥ `MIN_TRANSFER_MINUTES` | `createItinerary` |
| `GET /itineraries/:id` tính lại `connections` + `atRisk` theo giờ trễ hiện tại (không lưu) | `getItineraryById` |
| Booking thuộc hành trình không được confirm/cancel/xóa lẻ qua `/bookings` (400) | `booking.controller.js` |
| Loại ghế (`priority/window/aisle/standard`) suy ra từ vị trí khi khởi tạo | `utils/seatLayout.js` → `POST /seats/initialize`, seed |

---

## Test

```bash
npx jest src/tests/trip.api.test.js --coverage=false   # chạy 1 file
npm test                                               # tất cả + coverage
```

⚠️ **Đọc trước khi chạy hoặc viết test:**

1. **Test chạy trên DB thật** theo `MONGODB_URI` trong `.env` — hiện là cluster đang dùng cho production. Test phải:
   - dùng dữ liệu có đánh dấu riêng (vd. `fare: 999`, `code: 'IT-TEST-*'`, email `*@test.com`, `licenseNumber: 'LIC-TEST-*'`);
   - **dọn sạch** trong `afterAll`;
   - không sửa dữ liệu seed dùng chung (role, permission, user seed).
2. **Mỗi file test tự dựng mini app** → phải `require` đủ model mà populate cần, nếu không login trả 500:
   ```js
   require('../models/Role.model');
   require('../models/Permission.model');
   require('../models/RouteStop.model'); // khi populate route.stops
   ```
3. Test cần dữ liệu seed: user `admin@example.com` / `staff@example.com`, role `staff`, ít nhất 1 route/vehicle/driver active.
4. Một kết nối DB cho cả file: đóng trong `afterAll` **cấp ngoài cùng** nếu file có nhiều `describe`.
5. JWT `iat` chính xác tới giây — test đổi mật khẩu chờ > 1s sau khi login để token cũ chắc chắn bị vô hiệu.
6. Muốn thử an toàn: chạy MongoDB local (`MONGODB_URI=mongodb://127.0.0.1:27017/fleet_test`), `npm run seed:all`, chạy test, rồi drop DB đó (lưu ý: hành trình cần replica set nên test itinerary sẽ lỗi trên MongoDB standalone).

| File | Phạm vi |
|---|---|
| `auth.api.test.js` | Đổi mật khẩu, xoay vòng refresh token, đăng xuất theo thiết bị |
| `vehicle/route.api.test.js` | CRUD + 403 khi staff thiếu quyền `read` |
| `driver.api.test.js` | CRUD tài xế |
| `trip.api.test.js` | CRUD, trạng thái, trùng lịch, thời gian nghỉ tài xế, hạn bằng lái |
| `seat.api.test.js` | Khởi tạo (kèm loại ghế theo vị trí), sơ đồ, cập nhật trạng thái |
| `booking.api.test.js` | Vòng đời đặt vé, đặt ghế đã có người giữ → 409, phân quyền staff |
| `itinerary.api.test.js` | Hành trình nhiều chặng, transaction rollback, `atRisk` |

---

## Seed

- `npm run seed:all` chạy lần lượt: roles & permissions (+ admin) → users → vehicles → drivers → routes → trips → bookings/seats/itineraries. **Mỗi bước xóa dữ liệu cũ của nó.**
- Seed có sẵn tuyến nối tiếp (`HN-TB-01 → TB-ND-01`, `HN-HP-01 → HP-HL-01`) và 2 hành trình mẫu: 1 đã xác nhận, 1 đang "lỡ nối chuyến" (chặng 1 trễ 45 phút) để demo.
- Lịch seed đã kiểm tra không vi phạm quy tắc nghỉ của tài xế / trùng xe — giữ nguyên khi sửa.

---

## Deploy

Render (web service, root `be`, build `npm install`, start `npm start`). Auto-deploy từ `main` nếu đã bật; nếu không, Manual Deploy → *Deploy latest commit*. Frontend trên Netlify gọi tới URL Render này (`fe/src/environments/environment.production.ts`).
