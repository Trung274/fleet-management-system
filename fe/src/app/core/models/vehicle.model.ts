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
