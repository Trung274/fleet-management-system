import { Trip } from './trip.model';

export interface DashboardVehicleStats {
  total: number;
  active: number;
  maintenance: number;
  outOfService: number;
}

export interface DashboardDriverStats {
  total: number;
  active: number;
  inactive: number;
}

export interface DashboardTripsTodayStats {
  total: number;
  inProgress: number;
}

export interface DashboardBookingsTodayStats {
  total: number;
  confirmed: number;
}

export interface DashboardData {
  vehicles: DashboardVehicleStats;
  drivers: DashboardDriverStats;
  tripsToday: DashboardTripsTodayStats;
  bookingsToday: DashboardBookingsTodayStats;
  recentTrips: Trip[];
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}
