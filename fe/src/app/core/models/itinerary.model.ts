import { BookingPassenger, BookingStatus } from './booking.model';
import { Seat } from './seat.model';
import { TripStatus } from './trip.model';

export type ItineraryStatus = BookingStatus;

/** One leg (booking) of an itinerary, populated by GET /itineraries/:id */
export interface ItineraryLeg {
  _id: string;
  trip: {
    _id: string;
    scheduledDeparture: string;
    scheduledArrival: string;
    status: TripStatus;
    delayDuration?: number;
    route?: { _id: string; name: string; code: string; origin: string; destination: string };
    vehicle?: { _id: string; registrationNumber: string; make: string; model: string };
    driver?: { _id: string; firstName: string; lastName: string; phone?: string };
  };
  seat: Pick<Seat, '_id' | 'seatNumber'> & Partial<Pick<Seat, 'type' | 'status'>>;
  status: BookingStatus;
  fare?: number;
}

/** Transfer between two consecutive legs, re-checked against current trip times */
export interface ItineraryConnection {
  fromLeg: number;
  toLeg: number;
  transferAt: string;
  transferMinutes: number;
  ok: boolean;
}

export interface Itinerary {
  _id: string;
  passenger: BookingPassenger;
  legs: ItineraryLeg[];
  status: ItineraryStatus;
  totalFare: number;
  cancellationReason?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  // Only on GET /itineraries/:id
  connections?: ItineraryConnection[];
  atRisk?: boolean;
}

/** POST /itineraries */
export interface ItineraryLegPayload {
  tripId: string;
  seatId: string;
  fare?: number;
}

export interface ItineraryCreatePayload {
  passenger: BookingPassenger;
  legs: ItineraryLegPayload[];
}

export interface ItineraryListResponse {
  success: boolean;
  count: number;
  total: number;
  pagination: { page: number; limit: number; totalPages: number };
  data: Itinerary[];
}
