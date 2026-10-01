import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PermissionItem, Role, RoleUpdatePayload } from '../models/role.model';

/** Roles & permissions — backend restricts these endpoints to the admin role */
@Injectable({ providedIn: 'root' })
export class RoleService {
  private http = inject(HttpClient);
  private rolesUrl = `${environment.apiUrl}/roles`;
  private permissionsUrl = `${environment.apiUrl}/permissions`;

  /** GET /roles — permissions populated */
  getRoles(): Promise<Role[]> {
    return firstValueFrom(
      this.http.get<{ success: boolean; data: Role[] }>(this.rolesUrl)
    ).then(r => r.data);
  }

  /** GET /permissions */
  getPermissions(): Promise<PermissionItem[]> {
    return firstValueFrom(
      this.http.get<{ success: boolean; data: PermissionItem[] }>(this.permissionsUrl)
    ).then(r => r.data);
  }

  /** PUT /roles/:id */
  updateRole(id: string, payload: RoleUpdatePayload): Promise<Role> {
    return firstValueFrom(
      this.http.put<{ success: boolean; data: Role }>(`${this.rolesUrl}/${id}`, payload)
    ).then(r => r.data);
  }
}
