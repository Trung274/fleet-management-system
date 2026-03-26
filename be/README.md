# Node.js Backend API - Hướng dẫn đầy đủ

Backend API scalable với RBAC (Role-Based Access Control), authentication, MongoDB, và Swagger documentation.

## 📋 Mục lục
- [Cấu trúc project](#cấu-trúc-project)
- [Cài đặt](#cài-đặt)
- [Cấu hình MongoDB](#cấu-hình-mongodb)
- [Khởi tạo Roles & Permissions](#khởi-tạo-roles--permissions)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [API Documentation](#api-documentation)
- [Testing với Postman](#testing-với-postman)
- [Hệ thống phân quyền RBAC](#hệ-thống-phân-quyền-rbac)
- [Mở rộng project](#mở-rộng-project)

## 🏗️ Cấu trúc Project

```
nodejs-backend-api/
├── src/
│   ├── config/
│   │   ├── database.js              # Kết nối MongoDB
│   │   ├── swagger.js               # Cấu hình Swagger
│   │   └── seedRolesPermissions.js  # Khởi tạo roles & permissions
│   ├── controllers/
│   │   ├── auth.controller.js       # Logic xác thực
│   │   ├── user.controller.js       # Logic quản lý user
│   │   ├── role.controller.js       # Logic quản lý roles
│   │   └── permission.controller.js # Logic quản lý permissions
│   ├── middleware/
│   │   ├── auth.js                  # Middleware xác thực JWT & permissions
│   │   └── errorHandler.js          # Xử lý lỗi tập trung
│   ├── models/
│   │   ├── User.model.js            # Schema User với role reference
│   │   ├── Role.model.js            # Schema Role
│   │   └── Permission.model.js      # Schema Permission
│   ├── routes/
│   │   ├── auth.routes.js           # Routes xác thực
│   │   ├── user.routes.js           # Routes quản lý user
│   │   ├── role.routes.js           # Routes quản lý roles
│   │   └── permission.routes.js     # Routes quản lý permissions
│   ├── utils/
│   │   ├── asyncHandler.js          # Wrapper xử lý async
│   │   └── errorResponse.js         # Class lỗi tùy chỉnh
│   └── server.js                    # Entry point
├── .env                              # Biến môi trường
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Cài đặt

### 1. Clone hoặc tạo thư mục project

```bash
mkdir nodejs-backend-api
cd nodejs-backend-api
```

### 2. Copy các file code vào đúng cấu trúc thư mục như trên

### 3. Cài đặt dependencies

```bash
npm install
```

### 4. Tạo file .env và cấu hình

Copy nội dung từ file `.env` đã tạo và điều chỉnh các giá trị:

```env
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/your_database_name

# JWT
JWT_SECRET=your_super_secret_key_at_least_32_characters_long
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_key_also_very_long
JWT_REFRESH_EXPIRE=30d

# CORS
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🗄️ Cấu hình MongoDB

### Option 1: MongoDB Local (Khuyến nghị cho development)

1. **Cài đặt MongoDB:**
   - Windows: Download từ https://www.mongodb.com/try/download/community
   - Mac: `brew install mongodb-community`
   - Linux: `sudo apt-get install mongodb`

2. **Khởi động MongoDB:**
   ```bash
   # Windows
   mongod
   
   # Mac/Linux
   brew services start mongodb-community
   # hoặc
   sudo systemctl start mongod
   ```

3. **Cập nhật .env:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/my_project_db
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Tạo tài khoản:** https://www.mongodb.com/cloud/atlas/register
2. **Tạo Cluster FREE (M0)**
3. **Setup Database Access & Network Access**
4. **Lấy Connection String và cập nhật .env:**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/my_database?retryWrites=true&w=majority
   ```

## 🔐 Khởi tạo Roles & Permissions

**QUAN TRỌNG:** Phải chạy seeder trước khi sử dụng API!

```bash
npm run seed:roles
```

Seeder sẽ tạo:
- ✅ **14 Permissions** (users, roles, permissions management)
- ✅ **2 Roles:** `admin` và `user`
- ✅ **1 Admin account mặc định:**
  - Email: `admin@example.com`
  - Password: `Admin@123`
  - ⚠️ **ĐỔI PASSWORD NÀY NGAY SAU KHI LOGIN!**

**Lưu ý:** 
- Chạy seeder sẽ **XÓA VÀ TẠO LẠI** tất cả roles & permissions
- Chỉ chạy 1 lần khi setup ban đầu hoặc khi cần reset
- Admin users sẽ không bị xóa khi chạy lại seeder

## ▶️ Chạy ứng dụng

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm start
```

Server chạy tại: `http://localhost:5000`

## 📚 API Documentation

Truy cập Swagger UI: `http://localhost:5000/api-docs`

### Các endpoints chính:

#### Authentication
- `POST /api/v1/auth/create-user` - Tạo user mới (Admin only) 🔒
- `POST /api/v1/auth/login` - Đăng nhập
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Đăng xuất 🔒
- `GET /api/v1/auth/me` - Lấy thông tin user hiện tại 🔒

#### Users (Protected)
- `GET /api/v1/users` - Lấy danh sách users (Admin only) 🔒
- `GET /api/v1/users/:id` - Lấy thông tin user 🔒
- `PUT /api/v1/users/:id` - Cập nhật user 🔒
- `DELETE /api/v1/users/:id` - Xóa user (Admin only) 🔒

#### Roles (Admin only)
- `GET /api/v1/roles` - Lấy danh sách roles 🔒
- `GET /api/v1/roles/:id` - Lấy thông tin role 🔒
- `POST /api/v1/roles` - Tạo role mới 🔒
- `PUT /api/v1/roles/:id` - Cập nhật role 🔒
- `DELETE /api/v1/roles/:id` - Xóa role 🔒

#### Permissions (Admin only)
- `GET /api/v1/permissions?grouped=true` - Lấy danh sách permissions 🔒
- `GET /api/v1/permissions/:id` - Lấy thông tin permission 🔒
- `POST /api/v1/permissions` - Tạo permission mới 🔒
- `PUT /api/v1/permissions/:id` - Cập nhật permission 🔒
- `DELETE /api/v1/permissions/:id` - Xóa permission 🔒

🔒 = Yêu cầu authentication (Bearer token)

## 🧪 Testing với Postman

### 1. Đăng nhập với Admin
```http
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "name": "System Admin",
      "email": "admin@example.com",
      "role": {
        "name": "admin",
        "permissions": [...]
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Lưu lại `token` để dùng cho các request tiếp theo!**

### 2. Tạo user mới (Admin only)
```http
POST http://localhost:5000/api/v1/auth/create-user
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "roleName": "user"
}
```

### 3. Sử dụng protected endpoints
```http
GET http://localhost:5000/api/v1/auth/me
Authorization: Bearer YOUR_TOKEN_HERE
```

### 4. Xem danh sách permissions (grouped)
```http
GET http://localhost:5000/api/v1/permissions?grouped=true
Authorization: Bearer YOUR_ADMIN_TOKEN
```

Response:
```json
{
  "success": true,
  "count": 14,
  "data": {
    "users": [
      { "resource": "users", "action": "create", "description": "..." },
      { "resource": "users", "action": "read", "description": "..." },
      ...
    ],
    "roles": [...],
    "permissions": [...],
    "profile": [...]
  }
}
```

## 🔐 Hệ thống phân quyền RBAC

### Kiến trúc phân quyền

```
User → Role → Permissions
```

- **User**: Người dùng của hệ thống
- **Role**: Vai trò (admin, user, ...)
- **Permission**: Quyền cụ thể (users:create, posts:delete, ...)

### Cách hoạt động

1. **Mỗi User được gán 1 Role**
   ```javascript
   user.role = ObjectId("role_id")
   ```

2. **Mỗi Role có nhiều Permissions**
   ```javascript
   role.permissions = [ObjectId("perm1"), ObjectId("perm2"), ...]
   ```

3. **Permission format:** `resource:action`
   - Resource: users, roles, permissions, posts, comments...
   - Action: create, read, update, delete, list

### Roles mặc định

#### Admin Role
- Có **TẤT CẢ** permissions
- Bypass mọi permission check
- Quản lý users, roles, permissions

#### User Role
- Chỉ có permissions:
  - `profile:read` - Xem profile của mình
  - `profile:update` - Sửa profile của mình

### Middleware phân quyền

#### 1. `protect` - Xác thực JWT
```javascript
router.get('/users', protect, userController.getAllUsers);
```

#### 2. `authorize(...roles)` - Kiểm tra role name
```javascript
router.get('/users', protect, authorize('admin'), userController.getAllUsers);
```

#### 3. `checkPermission(resource, action)` - Kiểm tra permission cụ thể
```javascript
router.post('/users', 
  protect, 
  authorize('admin'),
  checkPermission('users', 'create'), 
  userController.createUser
);
```

#### 4. `checkAnyPermission([...])` - Kiểm tra 1 trong nhiều permissions
```javascript
router.put('/posts/:id', 
  protect,
  checkAnyPermission([
    { resource: 'posts', action: 'update' },
    { resource: 'posts', action: 'moderate' }
  ]),
  postController.updatePost
);
```

### Sử dụng trong code

#### Trong Model:
```javascript
// Kiểm tra user có permission không
if (req.user.hasPermission('posts', 'delete')) {
  // Cho phép xóa
}

// Kiểm tra user có 1 trong nhiều permissions
if (req.user.hasAnyPermission([
  { resource: 'posts', action: 'update' },
  { resource: 'posts', action: 'delete' }
])) {
  // Cho phép
}
```

### Tạo Role & Permission mới

#### 1. Tạo Permission mới
```http
POST http://localhost:5000/api/v1/permissions
Authorization: Bearer ADMIN_TOKEN

{
  "resource": "posts",
  "action": "create",
  "description": "Create new posts"
}
```

#### 2. Tạo Role mới
```http
POST http://localhost:5000/api/v1/roles
Authorization: Bearer ADMIN_TOKEN

{
  "name": "editor",
  "description": "Content editor with post management",
  "permissions": ["permission_id_1", "permission_id_2"]
}
```

#### 3. Assign Role cho User
```http
PUT http://localhost:5000/api/v1/users/{userId}
Authorization: Bearer ADMIN_TOKEN

{
  "role": "editor"
}
```

### Security Features

1. ✅ **Tự động hash password** (bcrypt)
2. ✅ **JWT access token** (short-lived)
3. ✅ **Refresh token rotation** (long-lived)
4. ✅ **Password changed detection** (invalidate old tokens)
5. ✅ **Account deactivation check**
6. ✅ **Admin bypass** (admin tự động có mọi quyền)
7. ✅ **Role-based access control**
8. ✅ **Permission-based access control**
9. ✅ **Rate limiting** (100 requests/15 phút)
10. ✅ **MongoDB injection protection**
11. ✅ **CORS configuration**
12. ✅ **Helmet security headers**

## 🔧 Mở rộng Project

### Thêm Permission cho module mới

**Ví dụ: Thêm module Posts**

1. **Tạo permissions:**
```javascript
// Thêm vào seeder hoặc tạo qua API
{ resource: 'posts', action: 'create', description: 'Create posts' },
{ resource: 'posts', action: 'read', description: 'Read posts' },
{ resource: 'posts', action: 'update', description: 'Update posts' },
{ resource: 'posts', action: 'delete', description: 'Delete posts' },
{ resource: 'posts', action: 'publish', description: 'Publish posts' },
```

2. **Tạo Model:**
```javascript
// src/models/Post.model.js
const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' }
}, { timestamps: true });
```

3. **Tạo Routes với permission checks:**
```javascript
// src/routes/post.routes.js
router.post('/', 
  protect, 
  checkPermission('posts', 'create'),
  postController.createPost
);

router.put('/:id/publish', 
  protect,
  checkPermission('posts', 'publish'),
  postController.publishPost
);
```

4. **Assign permissions vào roles:**
```http
PUT http://localhost:5000/api/v1/roles/{roleId}

{
  "permissions": ["old_perm_1", "old_perm_2", "new_post_perm_1", ...]
}
```

### Tạo Role mới cho use case cụ thể

**Ví dụ: Role "Editor" cho quản lý nội dung**

```javascript
// Tạo permissions cho editor
const editorPermissions = [
  'posts:create',
  'posts:read', 
  'posts:update',
  'posts:delete',
  'posts:publish',
  'profile:read',
  'profile:update'
];

// Tạo role qua API
POST /api/v1/roles
{
  "name": "editor",
  "description": "Content editor with post management access",
  "permissions": [/* array of permission IDs */]
}
```

## 📝 Best Practices

### 1. Bảo mật
- ✅ Đổi `JWT_SECRET` thành chuỗi ngẫu nhiên mạnh (>32 ký tự)
- ✅ Đổi admin password mặc định sau khi setup
- ✅ Sử dụng HTTPS trong production
- ✅ Giới hạn CORS origin trong production
- ✅ Không commit file `.env` lên git
- ✅ Implement rate limiting phù hợp với traffic
- ✅ Log và monitor các hoạt động nhạy cảm

### 2. Database
- ✅ Indexes đã được tạo sẵn cho performance
- ✅ Sử dụng pagination cho danh sách lớn
- ✅ Backup database định kỳ
- ✅ Không xóa roles/permissions mặc định

### 3. Permissions Management
- ✅ Tạo permissions theo format `resource:action`
- ✅ Nhóm permissions theo modules/features
- ✅ Document rõ ràng từng permission
- ✅ Test kỹ permission checks trước khi deploy
- ✅ Admin luôn có mọi quyền (không cần assign từng permission)

### 4. Code Organization
- ✅ Tách business logic ra services (nếu phức tạp)
- ✅ Viết tests cho critical features
- ✅ Document API đầy đủ trong Swagger
- ✅ Follow naming conventions nhất quán

## 🆘 Troubleshooting

### Lỗi: "User registration is disabled"
**Nguyên nhân:** Hệ thống không cho phép tự đăng ký.  
**Giải pháp:** Sử dụng admin account để tạo user qua `/api/v1/auth/create-user`

### Lỗi: "User role '...' is not authorized"
**Nguyên nhân:** User không có role phù hợp.  
**Giải pháp:** Admin cần assign đúng role cho user qua `/api/v1/users/:id`

### Lỗi: "You don't have permission to ... ..."
**Nguyên nhân:** Role của user không có permission cần thiết.  
**Giải pháp:** Admin cần:
1. Tạo permission (nếu chưa có)
2. Assign permission vào role của user

### Lỗi: "Role 'xxx' not found"
**Nguyên nhân:** Chưa chạy seeder hoặc role không tồn tại.  
**Giải pháp:** 
```bash
npm run seed:roles
```

### Lỗi kết nối MongoDB
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Giải pháp:** Đảm bảo MongoDB đang chạy hoặc kiểm tra connection string trong .env

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. ✅ Check server logs trong terminal
2. ✅ Kiểm tra MongoDB đang chạy
3. ✅ Verify environment variables trong .env
4. ✅ Đảm bảo đã chạy seeder
5. ✅ Test trên Swagger docs để debug
6. ✅ Check authorization header format: `Bearer TOKEN`

---