import { TripStatus } from './trip.model';

// Every section is optional: the backend only sends what the user may read

export interface DashboardScheduleItem {
  _id: string;
  route?: { code: string; name: string; origin: string; destination: string };
  vehicle?: { registrationNumber: string };
  driver?: { firstName: string; lastName: string };
  scheduledDeparture: string;
  scheduledArrival: string;
  status: TripStatus;
  delayDuration?: number;
  /** Only when the user can read seats */
  seats?: { total: number; taken: number };
}

export interface DashboardTrips {
  today: { total: number; scheduled: number; inProgress: number; delayed: number; completed: number; cancelled: number };
  yesterdayTotal: number;
  schedule: DashboardScheduleItem[];
}

export interface SeatOccupancy {
  total: number;
  taken: number;
}

export interface DashboardRevenueDay {
  date: string; // YYYY-MM-DD (server local day)
  revenue: number; // confirmed fares
  pending: number;
  tickets: number;
}

export interface DashboardRevenue {
  today: { confirmed: number; pending: number; tickets: number };
  yesterday: { confirmed: number; tickets: number };
  last7Days: DashboardRevenueDay[];
  topRoutes: { code: string; name: string; tickets: number; revenue: number }[];
}

export interface DashboardVehicles {
  total: number; // fleet, excluding retired
  active: number;
  maintenance: number;
  outOfService: number;
  retired: number;
}

export interface DashboardDrivers {
  total: number; // excluding terminated
  active: number;
  onLeave: number;
  suspended: number;
}

export interface DashboardData {
  generatedAt: string;
  trips?: DashboardTrips;
  seats?: { today: SeatOccupancy; yesterday: SeatOccupancy };
  revenue?: DashboardRevenue;
  vehicles?: DashboardVehicles;
  drivers?: DashboardDrivers;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}
