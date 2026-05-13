import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Booking,
  BookingCreatePayload,
  BookingCancelPayload,
  BookingListResponse,
} from '../models/booking.model';

interface BookingResponse { success: boolean; data: Booking }

export interface BookingListParams {
  page?: number;
  limit?: number;
  tripId?: string;
  status?: string;
  search?: string;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/bookings`;

  /** GET /bookings */
  getAll(p: BookingListParams = {}): Promise<BookingListResponse> {
    let params = new HttpParams();
    if (p.page)   params = params.set('page',   p.page);
    if (p.limit)  params = params.set('limit',  p.limit);
    if (p.tripId) params = params.set('tripId', p.tripId);
    if (p.status) params = params.set('status', p.status);
    if (p.search) params = params.set('search', p.search);
    if (p.sort)   params = params.set('sort',   p.sort);
    return firstValueFrom(this.http.get<BookingListResponse>(this.base, { params }));
  }

  /** GET /bookings/:id */
  getById(id: string): Promise<Booking> {
    return firstValueFrom(
      this.http.get<BookingResponse>(`${this.base}/${id}`)
    ).then(r => r.data);
  }

  /** POST /bookings */
  create(payload: BookingCreatePayload): Promise<Booking> {
    return firstValueFrom(
      this.http.post<BookingResponse>(this.base, payload)
    ).then(r => r.data);
  }

  /** PATCH /bookings/:id/confirm */
  confirm(id: string): Promise<Booking> {
    return firstValueFrom(
      this.http.patch<BookingResponse>(`${this.base}/${id}/confirm`, {})
    ).then(r => r.data);
  }

  /** PATCH /bookings/:id/cancel */
  cancel(id: string, payload: BookingCancelPayload = {}): Promise<Booking> {
    return firstValueFrom(
      this.http.patch<BookingResponse>(`${this.base}/${id}/cancel`, payload)
    ).then(r => r.data);
  }

  /** DELETE /bookings/:id */
  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }
}
