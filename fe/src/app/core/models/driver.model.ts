export type EmploymentStatus = 'active' | 'on-leave' | 'suspended' | 'terminated';
export type LicenseType = 'Class A' | 'Class B' | 'Class C';

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: string;
  licenseNumber: string;
  licenseType: LicenseType;
  licenseExpiry: string;
  employmentStatus: EmploymentStatus;
  hireDate?: string;
  terminationDate?: string;
  emergencyContact?: EmergencyContact;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverCreatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: string;
  licenseNumber: string;
  licenseType: LicenseType;
  licenseExpiry: string;
  employmentStatus?: EmploymentStatus;
  hireDate?: string;
  emergencyContact?: EmergencyContact;
  notes?: string;
}

export interface DriverUpdatePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  licenseNumber?: string;
  licenseType?: LicenseType;
  licenseExpiry?: string;
  employmentStatus?: EmploymentStatus;
  hireDate?: string;
  terminationDate?: string;
  emergencyContact?: EmergencyContact;
  notes?: string;
}

export interface DriverListResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: Driver[];
}

export interface DriverResponse {
  success: boolean;
  data: Driver;
}

export interface DriverQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  status?: string;
  licenseType?: string;
  search?: string;
}

// ─── License expiry ───────────────────────────────────────────────
export type LicenseStatus = 'valid' | 'expiring' | 'expired';

/** Licenses expiring within this many days are flagged */
export const LICENSE_EXPIRING_DAYS = 30;

/**
 * A license is valid through the end of its expiry date.
 * licenseExpiry is UTC midnight of the calendar date, so read the date part and
 * end that day in local time — same rule as the backend trip checks.
 */
export function licenseValidUntil(licenseExpiry: string): Date {
  const [y, m, d] = licenseExpiry.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/** Whole days left until the license expires (0 = expires today, negative = expired) */
export function licenseDaysLeft(licenseExpiry: string, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryDay = licenseValidUntil(licenseExpiry);
  expiryDay.setHours(0, 0, 0, 0);
  return Math.round((expiryDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function getLicenseStatus(licenseExpiry: string, now = new Date()): LicenseStatus {
  const daysLeft = licenseDaysLeft(licenseExpiry, now);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= LICENSE_EXPIRING_DAYS) return 'expiring';
  return 'valid';
}
