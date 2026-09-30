import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Itinerary,
  ItineraryCreatePayload,
  ItineraryListResponse,
} from '../models/itinerary.model';

interface ItineraryResponse { success: boolean; data: Itinerary }

export interface ItineraryListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class ItineraryService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/itineraries`;

  /** GET /itineraries */
  getAll(p: ItineraryListParams = {}): Promise<ItineraryListResponse> {
    let params = new HttpParams();
    if (p.page)   params = params.set('page',   p.page);
    if (p.limit)  params = params.set('limit',  p.limit);
    if (p.status) params = params.set('status', p.status);
    if (p.search) params = params.set('search', p.search);
    if (p.sort)   params = params.set('sort',   p.sort);
    return firstValueFrom(this.http.get<ItineraryListResponse>(this.base, { params }));
  }

  /** GET /itineraries/:id — includes connections + atRisk */
  getById(id: string): Promise<Itinerary> {
    return firstValueFrom(
      this.http.get<ItineraryResponse>(`${this.base}/${id}`)
    ).then(r => r.data);
  }

  /** POST /itineraries */
  create(payload: ItineraryCreatePayload): Promise<Itinerary> {
    return firstValueFrom(
      this.http.post<ItineraryResponse>(this.base, payload)
    ).then(r => r.data);
  }

  /** PATCH /itineraries/:id/confirm */
  confirm(id: string): Promise<Itinerary> {
    return firstValueFrom(
      this.http.patch<ItineraryResponse>(`${this.base}/${id}/confirm`, {})
    ).then(r => r.data);
  }

  /** PATCH /itineraries/:id/cancel */
  cancel(id: string, reason?: string): Promise<Itinerary> {
    return firstValueFrom(
      this.http.patch<ItineraryResponse>(`${this.base}/${id}/cancel`, { reason })
    ).then(r => r.data);
  }
}
