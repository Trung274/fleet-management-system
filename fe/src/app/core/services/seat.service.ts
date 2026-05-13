import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Seat, SeatAvailability } from '../models/seat.model';

interface SeatMapResponse { success: boolean; count: number; data: Seat[] }
interface AvailabilityResponse { success: boolean; data: SeatAvailability }
interface SeatResponse { success: boolean; data: Seat }

@Injectable({ providedIn: 'root' })
export class SeatService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/seats`;

  /** GET /seats?tripId=&status= — authenticated */
  getSeatMap(tripId: string, status?: string): Promise<SeatMapResponse> {
    let params = new HttpParams().set('tripId', tripId);
    if (status) params = params.set('status', status);
    return firstValueFrom(this.http.get<SeatMapResponse>(this.base, { params }));
  }

  /** GET /seats/availability?tripId= — public */
  getAvailability(tripId: string): Promise<SeatAvailability> {
    const params = new HttpParams().set('tripId', tripId);
    return firstValueFrom(
      this.http.get<AvailabilityResponse>(`${this.base}/availability`, { params })
    ).then(r => r.data);
  }

  /** POST /seats/initialize */
  initializeSeats(tripId: string): Promise<{ count: number; data: Seat[] }> {
    return firstValueFrom(
      this.http.post<{ success: boolean; count: number; data: Seat[] }>(
        `${this.base}/initialize`,
        { tripId }
      )
    );
  }

  /** PATCH /seats/:id */
  updateStatus(seatId: string, status: 'available' | 'unavailable'): Promise<Seat> {
    return firstValueFrom(
      this.http.patch<SeatResponse>(`${this.base}/${seatId}`, { status })
    ).then(r => r.data);
  }
}
