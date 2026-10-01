import { ExpiryStatus, validUntilEndOfDay, expiryDaysLeft, expiryStatus } from '../utils/expiry';

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
// Shared rule in core/utils/expiry.ts (also used for vehicle inspection)

export type LicenseStatus = ExpiryStatus;

/** Licenses expiring within this many days are flagged */
export const LICENSE_EXPIRING_DAYS = 30;

export const licenseValidUntil = (licenseExpiry: string): Date => validUntilEndOfDay(licenseExpiry);
export const licenseDaysLeft = (licenseExpiry: string, now = new Date()): number => expiryDaysLeft(licenseExpiry, now);
export const getLicenseStatus = (licenseExpiry: string, now = new Date()): LicenseStatus =>
  expiryStatus(licenseExpiry, LICENSE_EXPIRING_DAYS, now);
