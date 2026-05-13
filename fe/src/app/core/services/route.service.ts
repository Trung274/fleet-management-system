import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BusRoute,
  RouteCreatePayload,
  RouteUpdatePayload,
  RouteListResponse,
  RouteResponse,
  RouteQueryParams,
} from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class RouteService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/routes`;

  async getAll(query: RouteQueryParams = {}): Promise<RouteListResponse> {
    let params = new HttpParams();
    if (query.page)        params = params.set('page', query.page);
    if (query.limit)       params = params.set('limit', query.limit);
    if (query.sort)        params = params.set('sort', query.sort);
    if (query.status)      params = params.set('status', query.status);
    if (query.serviceType) params = params.set('serviceType', query.serviceType);
    if (query.search)      params = params.set('search', query.search);

    return firstValueFrom(
      this.http.get<RouteListResponse>(this.apiUrl, { params }),
    );
  }

  async getById(id: string): Promise<RouteResponse> {
    return firstValueFrom(
      this.http.get<RouteResponse>(`${this.apiUrl}/${id}`),
    );
  }

  async create(payload: RouteCreatePayload): Promise<RouteResponse> {
    return firstValueFrom(
      this.http.post<RouteResponse>(this.apiUrl, payload),
    );
  }

  async update(id: string, payload: RouteUpdatePayload): Promise<RouteResponse> {
    return firstValueFrom(
      this.http.put<RouteResponse>(`${this.apiUrl}/${id}`, payload),
    );
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
  }
}
