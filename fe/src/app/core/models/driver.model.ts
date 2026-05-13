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
