import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/auth.model';

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;              // role name
  status?: 'active' | 'inactive';
}

export interface UserListResponse {
  success: boolean;
  count: number;
  total: number;
  currentPage: number;
  totalPages: number;
  data: User[];
}

export interface UserCreatePayload {
  name: string;
  email: string;
  password: string;
  roleName: string;
}

/** Admin update: role is a Role id; isActive=false signs the user out everywhere */
export interface UserUpdatePayload {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

/** User management — list/delete are admin-only on the backend */
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/users`;

  /** GET /users */
  getAll(p: UserListParams = {}): Promise<UserListResponse> {
    let params = new HttpParams();
    if (p.page)   params = params.set('page', p.page);
    if (p.limit)  params = params.set('limit', p.limit);
    if (p.search) params = params.set('search', p.search);
    if (p.role)   params = params.set('role', p.role);
    if (p.status) params = params.set('status', p.status);
    return firstValueFrom(this.http.get<UserListResponse>(this.base, { params }));
  }

  /** POST /auth/create-user — there is no self-registration */
  create(payload: UserCreatePayload): Promise<User> {
    return firstValueFrom(
      this.http.post<{ success: boolean; data: User }>(`${environment.apiUrl}/auth/create-user`, payload)
    ).then(r => r.data);
  }

  /** PUT /users/:id */
  update(id: string, payload: UserUpdatePayload): Promise<User> {
    return firstValueFrom(
      this.http.put<{ success: boolean; data: User }>(`${this.base}/${id}`, payload)
    ).then(r => r.data);
  }

  /** DELETE /users/:id */
  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }
}
