import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Vehicle,
  VehicleCreatePayload,
  VehicleUpdatePayload,
  VehicleListResponse,
  VehicleResponse,
  VehicleQueryParams,
} from '../models/vehicle.model';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/vehicles`;

  // ─── Get all with pagination & filters ────────────────────────
  async getAll(params: VehicleQueryParams = {}): Promise<VehicleListResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.search) httpParams = httpParams.set('search', params.search);

    return firstValueFrom(
      this.http.get<VehicleListResponse>(this.apiUrl, { params: httpParams }),
    );
  }

  // ─── Get by ID ─────────────────────────────────────────────────
  async getById(id: string): Promise<VehicleResponse> {
    return firstValueFrom(
      this.http.get<VehicleResponse>(`${this.apiUrl}/${id}`),
    );
  }

  // ─── Create ────────────────────────────────────────────────────
  async create(payload: VehicleCreatePayload): Promise<VehicleResponse> {
    return firstValueFrom(
      this.http.post<VehicleResponse>(this.apiUrl, payload),
    );
  }

  // ─── Update ────────────────────────────────────────────────────
  async update(id: string, payload: VehicleUpdatePayload): Promise<VehicleResponse> {
    return firstValueFrom(
      this.http.put<VehicleResponse>(`${this.apiUrl}/${id}`, payload),
    );
  }

  // ─── Delete ────────────────────────────────────────────────────
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(
      this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`),
    );
  }
}
