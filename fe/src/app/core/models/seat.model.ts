export type SeatStatus = 'available' | 'reserved' | 'booked' | 'unavailable';
export type SeatType   = 'standard' | 'window' | 'aisle' | 'priority';

export interface Seat {
  _id: string;
  trip: string;
  vehicle: string;
  seatNumber: number;
  type: SeatType;
  status: SeatStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SeatAvailability {
  tripId: string;
  totalSeats: number;
  availableSeats: number;
  reservedSeats: number;
  bookedSeats: number;
  unavailableSeats: number;
  seats: Seat[];
}
