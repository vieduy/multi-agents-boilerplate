import { authAPI } from "./auth";

interface RequestConfig extends RequestInit {
  requiresAuth?: boolean;
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { requiresAuth = true, ...fetchConfig } = config;

    // Add auth header if required
    if (requiresAuth) {
      const accessToken = localStorage.getItem("access_token");

      if (accessToken) {
        fetchConfig.headers = {
          ...fetchConfig.headers,
          Authorization: `Bearer ${accessToken}`,
        };
      }
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, fetchConfig);

      // Handle 401 - Token expired
      if (response.status === 401 && requiresAuth) {
        // Try to refresh token
        const refreshToken = localStorage.getItem("refresh_token");

        if (refreshToken) {
          try {
            const { access_token } = await authAPI.refreshToken(refreshToken);
            localStorage.setItem("access_token", access_token);

            // Retry original request with new token
            fetchConfig.headers = {
              ...fetchConfig.headers,
              Authorization: `Bearer ${access_token}`,
            };

            const retryResponse = await fetch(
              `${this.baseURL}${endpoint}`,
              fetchConfig
            );

            if (!retryResponse.ok) {
              throw new Error(
                `HTTP ${retryResponse.status}: ${retryResponse.statusText}`
              );
            }

            return retryResponse.json();
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
            throw refreshError;
          }
        } else {
          // No refresh token, redirect to login
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.detail || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...config?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }
}

// Create client instances
export const agentRouterClient = new APIClient(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
);

export const authClient = new APIClient(
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "http://localhost:8001"
);
