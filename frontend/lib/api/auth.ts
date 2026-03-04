import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  User,
  TokenRefreshResponse,
  HealthResponse,
} from "@/types/auth";

const AUTH_SERVICE_URL =
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "http://localhost:8001";

class AuthAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = AUTH_SERVICE_URL;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }

    return response.json();
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    return response.json();
  }

  async getCurrentUser(token: string): Promise<User> {
    const response = await fetch(`${this.baseURL}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to get user info");
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<TokenRefreshResponse> {
    const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Token refresh failed");
    }

    return response.json();
  }

  async logout(token: string): Promise<void> {
    await fetch(`${this.baseURL}/api/v1/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseURL}/health`);
    return response.json();
  }
}

export const authAPI = new AuthAPI();
