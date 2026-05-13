export type TripStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'delayed';

/** Populated sub-object returned from GET endpoints */
export interface TripRoute {
  _id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
}

export interface TripVehicle {
  _id: string;
  registrationNumber: string;
  make: string;
  model: string;
  capacity: number;
}

export interface TripDriver {
  _id: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
}

export interface Trip {
  _id: string;
  route: TripRoute;
  vehicle: TripVehicle;
  driver: TripDriver;
  scheduledDeparture: string;
  scheduledArrival: string;
  actualDeparture?: string;
  actualArrival?: string;
  status: TripStatus;
  passengerCount?: number;
  fare?: number;
  notes?: string;
  cancellationReason?: string;
  delayReason?: string;
  delayDuration?: number;
  createdAt: string;
  updatedAt: string;
}

/** POST /trips — IDs only (not populated) */
export interface TripCreatePayload {
  route: string;      // ObjectId
  vehicle: string;    // ObjectId
  driver: string;     // ObjectId
  scheduledDeparture: string; // ISO datetime
  scheduledArrival: string;   // ISO datetime
  fare?: number;
  notes?: string;
}

/** PUT /trips/:id */
export interface TripUpdatePayload {
  route?: string;
  vehicle?: string;
  driver?: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
  fare?: number;
  notes?: string;
  status?: TripStatus;
  cancellationReason?: string;
  delayReason?: string;
  delayDuration?: number;
}

/** POST /trips/:id/cancel */
export interface TripCancelPayload {
  cancellationReason: string;
}

/** POST /trips/:id/complete */
export interface TripCompletePayload {
  passengerCount?: number;
  notes?: string;
}

/** POST /trips/:id/delay */
export interface TripDelayPayload {
  delayReason: string;
  delayDuration: number;
}

export interface TripListResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: Trip[];
}

export interface TripResponse {
  success: boolean;
  data: Trip;
}

export interface TripQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  status?: string;
  route?: string;
  vehicle?: string;
  driver?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}
