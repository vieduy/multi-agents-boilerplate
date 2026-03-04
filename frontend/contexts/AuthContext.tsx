"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authAPI } from "@/lib/api/auth";
import { User, RegisterRequest, LoginRequest } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem("access_token");

        if (storedToken) {
          // Verify token is still valid by fetching user info
          const userData = await authAPI.getCurrentUser(storedToken);
          setUser(userData);
          setAccessToken(storedToken);
        }
      } catch (error) {
        // Token is invalid or expired, try to refresh
        const refreshToken = localStorage.getItem("refresh_token");

        if (refreshToken) {
          try {
            const { access_token } = await authAPI.refreshToken(refreshToken);
            const userData = await authAPI.getCurrentUser(access_token);

            setUser(userData);
            setAccessToken(access_token);
            localStorage.setItem("access_token", access_token);
          } catch (refreshError) {
            // Refresh failed, clear tokens
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authAPI.login(credentials);

      setUser(response.user);
      setAccessToken(response.access_token);

      // Store tokens
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authAPI.register(data);

      setUser(response.user);
      setAccessToken(response.access_token);

      // Store tokens
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await authAPI.logout(accessToken);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local state and storage
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  };

  const refreshAuth = async () => {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const { access_token } = await authAPI.refreshToken(refreshToken);
      const userData = await authAPI.getCurrentUser(access_token);

      setUser(userData);
      setAccessToken(access_token);
      localStorage.setItem("access_token", access_token);
    } catch (error) {
      // Refresh failed, log out user
      await logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
