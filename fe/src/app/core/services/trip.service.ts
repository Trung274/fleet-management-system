import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Trip,
  TripCreatePayload,
  TripUpdatePayload,
  TripCancelPayload,
  TripCompletePayload,
  TripDelayPayload,
  TripListResponse,
  TripResponse,
  TripQueryParams,
} from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class TripService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/trips`;

  async getAll(query: TripQueryParams = {}): Promise<TripListResponse> {
    let params = new HttpParams();
    if (query.page)      params = params.set('page', query.page);
    if (query.limit)     params = params.set('limit', query.limit);
    if (query.sort)      params = params.set('sort', query.sort);
    if (query.status)    params = params.set('status', query.status);
    if (query.route)     params = params.set('route', query.route);
    if (query.vehicle)   params = params.set('vehicle', query.vehicle);
    if (query.driver)    params = params.set('driver', query.driver);
    if (query.date)      params = params.set('date', query.date);
    if (query.startDate) params = params.set('startDate', query.startDate);
    if (query.endDate)   params = params.set('endDate', query.endDate);

    return firstValueFrom(
      this.http.get<TripListResponse>(this.apiUrl, { params }),
    );
  }

  async getById(id: string): Promise<TripResponse> {
    return firstValueFrom(
      this.http.get<TripResponse>(`${this.apiUrl}/${id}`),
    );
  }

  async create(payload: TripCreatePayload): Promise<TripResponse> {
    return firstValueFrom(
      this.http.post<TripResponse>(this.apiUrl, payload),
    );
  }

  async update(id: string, payload: TripUpdatePayload): Promise<TripResponse> {
    return firstValueFrom(
      this.http.put<TripResponse>(`${this.apiUrl}/${id}`, payload),
    );
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
  }

  // ─── Lifecycle actions ─────────────────────────────────────────
  async start(id: string): Promise<TripResponse> {
    return firstValueFrom(
      this.http.post<TripResponse>(`${this.apiUrl}/${id}/start`, {}),
    );
  }

  async complete(id: string, payload: TripCompletePayload = {}): Promise<TripResponse> {
    return firstValueFrom(
      this.http.post<TripResponse>(`${this.apiUrl}/${id}/complete`, payload),
    );
  }

  async cancel(id: string, payload: TripCancelPayload): Promise<TripResponse> {
    return firstValueFrom(
      this.http.post<TripResponse>(`${this.apiUrl}/${id}/cancel`, payload),
    );
  }

  async delay(id: string, payload: TripDelayPayload): Promise<TripResponse> {
    return firstValueFrom(
      this.http.post<TripResponse>(`${this.apiUrl}/${id}/delay`, payload),
    );
  }
}
