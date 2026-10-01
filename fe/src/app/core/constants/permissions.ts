// Vietnamese labels for roles and permissions — shared by the roles page and the profile page

/** Resources a non-admin role can meaningfully hold. users/roles/permissions are left out:
 *  their endpoints check the admin role directly, so granting them to others does nothing. */
export const PERMISSION_RESOURCES: { key: string; label: string }[] = [
  { key: 'vehicles', label: 'Xe' },
  { key: 'drivers',  label: 'Tài xế' },
  { key: 'routes',   label: 'Tuyến đường' },
  { key: 'trips',    label: 'Chuyến đi' },
  { key: 'seats',    label: 'Ghế ngồi' },
  { key: 'bookings', label: 'Đặt vé & Hành trình' },
  { key: 'profile',  label: 'Hồ sơ cá nhân' },
];

export const ACTION_ORDER = ['read', 'list', 'create', 'update', 'delete'];

/** What each permission allows in this app */
const PERMISSION_LABELS: Record<string, string> = {
  'vehicles:read': 'Xem danh sách xe',
  'vehicles:create': 'Thêm xe',
  'vehicles:update': 'Sửa thông tin xe',
  'vehicles:delete': 'Xóa xe',
  'drivers:read': 'Xem danh sách tài xế',
  'drivers:create': 'Thêm tài xế',
  'drivers:update': 'Sửa thông tin tài xế',
  'drivers:delete': 'Xóa tài xế',
  'routes:read': 'Xem danh sách tuyến',
  'routes:create': 'Thêm tuyến',
  'routes:update': 'Sửa tuyến và điểm dừng',
  'routes:delete': 'Xóa tuyến',
  'trips:read': 'Xem danh sách chuyến',
  'trips:create': 'Lên lịch chuyến',
  'trips:update': 'Sửa, xuất phát, hoàn thành, báo trễ, hủy chuyến',
  'trips:delete': 'Xóa chuyến',
  'seats:read': 'Xem sơ đồ ghế',
  'seats:update': 'Khởi tạo ghế, đánh dấu ghế hỏng',
  'bookings:read': 'Xem đặt vé và hành trình',
  'bookings:create': 'Đặt vé, đặt hành trình',
  'bookings:update': 'Xác nhận, hủy vé và hành trình',
  'bookings:delete': 'Xóa vé đã hủy',
  'profile:read': 'Xem hồ sơ của mình',
  'profile:update': 'Sửa hồ sơ của mình',
};

const ACTION_LABELS: Record<string, string> = {
  read: 'Xem', list: 'Xem danh sách', create: 'Tạo mới', update: 'Cập nhật', delete: 'Xóa',
};

export const ROLE_ORDER = ['admin', 'manager', 'staff', 'user'];

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên', manager: 'Quản lý', staff: 'Nhân viên', user: 'Người dùng',
};

/** "vehicles:read" → "Xem danh sách xe" (falls back to a generic action label) */
export function permissionLabel(key: string): string {
  return PERMISSION_LABELS[key] ?? ACTION_LABELS[key.split(':')[1]] ?? key;
}

export function roleLabel(name: string | undefined): string {
  return (name && ROLE_LABELS[name]) || name || '';
}
