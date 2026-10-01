import { expiryStatus, daysFromToday, ExpiryStatus } from '../utils/expiry';

export type VehicleStatus = 'active' | 'maintenance' | 'out-of-service' | 'retired';

export interface Vehicle {
  _id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  status: VehicleStatus;
  color?: string;
  vin?: string;
  notes?: string;
  /** Inspection (đăng kiểm) valid through the end of this date */
  inspectionExpiry?: string;
  maintenanceIntervalDays?: number;
  lastMaintenanceAt?: string;
  /** Virtual from the backend: lastMaintenanceAt + interval (null until a first maintenance) */
  nextMaintenanceDue?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleCreatePayload {
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  status?: VehicleStatus;
  color?: string;
  vin?: string;
  notes?: string;
  inspectionExpiry?: string;
  maintenanceIntervalDays?: number;
  lastMaintenanceAt?: string;
}

export interface VehicleUpdatePayload {
  registrationNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  capacity?: number;
  status?: VehicleStatus;
  color?: string;
  vin?: string;
  notes?: string;
  inspectionExpiry?: string;
  maintenanceIntervalDays?: number;
  lastMaintenanceAt?: string;
}

export interface VehicleListResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: Vehicle[];
}

export interface VehicleResponse {
  success: boolean;
  data: Vehicle;
}

export interface VehicleQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  status?: string;
  search?: string;
}

// ─── Inspection / maintenance alerts (same windows as the header bell) ─────

export const INSPECTION_EXPIRING_DAYS = 30;
export const MAINTENANCE_DUE_DAYS = 7;

export const getInspectionStatus = (v: Vehicle): ExpiryStatus | null =>
  v.inspectionExpiry ? expiryStatus(v.inspectionExpiry, INSPECTION_EXPIRING_DAYS) : null;

/** 'overdue' / 'due' (within 7 days) / 'ok', or null when there is no maintenance history */
export function getMaintenanceDueStatus(v: Vehicle): 'overdue' | 'due' | 'ok' | null {
  if (!v.nextMaintenanceDue) return null;
  const days = daysFromToday(new Date(v.nextMaintenanceDue));
  if (days < 0) return 'overdue';
  if (days <= MAINTENANCE_DUE_DAYS) return 'due';
  return 'ok';
}
