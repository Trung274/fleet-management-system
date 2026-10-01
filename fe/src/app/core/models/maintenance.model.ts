export type MaintenanceType = 'periodic' | 'repair' | 'inspection';
export type MaintenanceStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface MaintenanceRecord {
  _id: string;
  vehicle: { _id: string; registrationNumber: string; make: string; model: string; status: string; capacity: number };
  type: MaintenanceType;
  scheduledStart: string;
  scheduledEnd: string;
  status: MaintenanceStatus;
  garage?: string;
  cost?: number;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface MaintenancePayload {
  vehicle?: string;
  type?: MaintenanceType;
  scheduledStart?: string;
  scheduledEnd?: string;
  garage?: string;
  cost?: number;
  notes?: string;
}

export interface MaintenanceListResponse {
  success: boolean;
  count: number;
  total: number;
  currentPage: number;
  totalPages: number;
  data: MaintenanceRecord[];
}

/** Body of a 409 when the vehicle has trips in the requested window */
export interface ConflictingTrip {
  _id: string;
  route?: { code: string; origin: string; destination: string };
  scheduledDeparture: string;
  scheduledArrival: string;
  status: string;
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  periodic: 'Bảo dưỡng định kỳ',
  repair: 'Sửa chữa',
  inspection: 'Đăng kiểm',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Đã lên lịch',
  'in-progress': 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};
