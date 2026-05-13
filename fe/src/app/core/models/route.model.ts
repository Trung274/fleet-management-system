export type RouteStatus = 'active' | 'inactive' | 'under-maintenance' | 'discontinued';
export type ServiceType = 'express' | 'local' | 'shuttle';

export interface BusRoute {
  _id: string;
  name: string;
  code: string;
  description?: string;
  origin: string;
  destination: string;
  distance: number;
  estimatedDuration: number; // minutes
  status: RouteStatus;
  serviceType: ServiceType;
  discontinuedDate?: string;
  stops?: RouteStop[];
  createdAt: string;
  updatedAt: string;
}

export interface RouteStop {
  _id: string;
  stopName: string;
  stopCode: string;
  address?: string;
  sequence: number;
  distanceFromStart?: number;
  estimatedArrivalTime?: number;   // minutes from start
  estimatedDepartureTime?: number; // minutes from start
  coordinates?: { latitude: number; longitude: number };
}

export interface RouteCreatePayload {
  name: string;
  code: string;
  description?: string;
  origin: string;
  destination: string;
  distance: number;
  estimatedDuration: number;
  status?: RouteStatus;
  serviceType?: ServiceType;
}

export interface RouteUpdatePayload {
  name?: string;
  code?: string;
  description?: string;
  origin?: string;
  destination?: string;
  distance?: number;
  estimatedDuration?: number;
  status?: RouteStatus;
  serviceType?: ServiceType;
}

export interface RouteListResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: BusRoute[];
}

export interface RouteResponse {
  success: boolean;
  data: BusRoute;
}

export interface RouteQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  status?: string;
  serviceType?: string;
  search?: string;
}
