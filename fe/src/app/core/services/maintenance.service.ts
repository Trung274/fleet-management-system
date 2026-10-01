import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MaintenanceListResponse, MaintenancePayload, MaintenanceRecord } from '../models/maintenance.model';

export interface MaintenanceListParams {
  page?: number;
  limit?: number;
  vehicle?: string;
  type?: string;
  /** Comma-separated statuses, e.g. 'scheduled,in-progress' */
  status?: string;
}

type One = { success: boolean; data: MaintenanceRecord };

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/maintenance`;

  getAll(p: MaintenanceListParams = {}): Promise<MaintenanceListResponse> {
    let params = new HttpParams();
    if (p.page)    params = params.set('page', p.page);
    if (p.limit)   params = params.set('limit', p.limit);
    if (p.vehicle) params = params.set('vehicle', p.vehicle);
    if (p.type)    params = params.set('type', p.type);
    if (p.status)  params = params.set('status', p.status);
    return firstValueFrom(this.http.get<MaintenanceListResponse>(this.base, { params }));
  }

  /** 409 → err.error.data.conflictingTrips lists the trips to move to another vehicle */
  create(payload: MaintenancePayload): Promise<MaintenanceRecord> {
    return firstValueFrom(this.http.post<One>(this.base, payload)).then(r => r.data);
  }

  update(id: string, payload: MaintenancePayload): Promise<MaintenanceRecord> {
    return firstValueFrom(this.http.put<One>(`${this.base}/${id}`, payload)).then(r => r.data);
  }

  start(id: string): Promise<MaintenanceRecord> {
    return firstValueFrom(this.http.patch<One>(`${this.base}/${id}/start`, {})).then(r => r.data);
  }

  /** Inspection records need the new inspectionExpiry (YYYY-MM-DD) */
  complete(id: string, body: { inspectionExpiry?: string; cost?: number; notes?: string } = {}): Promise<MaintenanceRecord> {
    return firstValueFrom(this.http.patch<One>(`${this.base}/${id}/complete`, body)).then(r => r.data);
  }

  cancel(id: string, reason?: string): Promise<MaintenanceRecord> {
    return firstValueFrom(this.http.patch<One>(`${this.base}/${id}/cancel`, { reason })).then(r => r.data);
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }
}
