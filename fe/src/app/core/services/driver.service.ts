import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Driver,
  DriverCreatePayload,
  DriverUpdatePayload,
  DriverListResponse,
  DriverResponse,
  DriverQueryParams,
} from '../models/driver.model';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/drivers`;

  async getAll(query: DriverQueryParams = {}): Promise<DriverListResponse> {
    let params = new HttpParams();
    if (query.page)        params = params.set('page', query.page);
    if (query.limit)       params = params.set('limit', query.limit);
    if (query.sort)        params = params.set('sort', query.sort);
    if (query.status)      params = params.set('status', query.status);
    if (query.licenseType) params = params.set('licenseType', query.licenseType);
    if (query.search)      params = params.set('search', query.search);

    return firstValueFrom(
      this.http.get<DriverListResponse>(this.apiUrl, { params }),
    );
  }

  async getById(id: string): Promise<DriverResponse> {
    return firstValueFrom(
      this.http.get<DriverResponse>(`${this.apiUrl}/${id}`),
    );
  }

  async create(payload: DriverCreatePayload): Promise<DriverResponse> {
    return firstValueFrom(
      this.http.post<DriverResponse>(this.apiUrl, payload),
    );
  }

  async update(id: string, payload: DriverUpdatePayload): Promise<DriverResponse> {
    return firstValueFrom(
      this.http.put<DriverResponse>(`${this.apiUrl}/${id}`, payload),
    );
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
  }
}
