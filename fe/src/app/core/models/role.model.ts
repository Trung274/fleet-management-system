export interface PermissionItem {
  _id: string;
  resource: string;
  action: string;
  description?: string;
  isActive: boolean;
}

export interface Role {
  _id: string;
  name: 'admin' | 'manager' | 'staff' | 'user';
  description?: string;
  permissions: PermissionItem[];
  isActive: boolean;
}

/** PUT /roles/:id — permissions are Permission ids */
export interface RoleUpdatePayload {
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}
