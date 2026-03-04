// User types
export interface User {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  roles: string[];
}

// Request types
export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  username?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Response types
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  message?: string;
}

export interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
}

export interface MessageResponse {
  message: string;
}

export interface TokenVerifyResponse {
  valid: boolean;
  user_id?: string;
  email?: string;
  roles?: string[];
  message?: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  database: string;
}

// Error types
export interface APIError {
  detail: string | ValidationError[];
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}
