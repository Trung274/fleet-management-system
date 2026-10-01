export interface Permission {
  resource: string;
  action: string;
  // Not kept in the cookie copy of the user (see TokenStorageService.setUser)
  _id?: string;
  description?: string;
  isActive?: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: {
    _id: string;
    name: string;
    permissions: Permission[];
  };
  isActive: boolean;
  /** Populated by GET /auth/me (who created this account); missing for seeded users */
  createdBy?: { _id: string; name: string; email: string } | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export interface RefreshTokenResponse {
  success: boolean;
  data: {
    token: string;
    /** Rotated — the refresh token that was sent is no longer valid */
    refreshToken: string;
  };
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserProfilePayload {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
}
