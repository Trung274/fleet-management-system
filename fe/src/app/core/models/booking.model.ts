import { Seat } from './seat.model';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface BookingPassenger {
  name: string;
  phone: string;
  email?: string;
  idNumber?: string;
}

/** Populated booking as returned by GET /bookings */
export interface Booking {
  _id: string;
  trip: {
    _id: string;
    scheduledDeparture: string;
    scheduledArrival: string;
    route: { _id: string; name: string; code: string; origin: string; destination: string };
    vehicle: { _id: string; registrationNumber: string; make: string; model: string };
  };
  seat: Seat;
  passenger: BookingPassenger;
  status: BookingStatus;
  fare?: number;
  cancellationReason?: string;
  bookedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** POST /bookings */
export interface BookingCreatePayload {
  tripId: string;
  seatId: string;
  passenger: BookingPassenger;
  fare?: number;
}

/** PATCH /bookings/:id/cancel */
export interface BookingCancelPayload {
  reason?: string;
}

export interface BookingListResponse {
  success: boolean;
  count: number;
  total: number;
  pagination: { page: number; limit: number; totalPages: number };
  data: Booking[];
}
