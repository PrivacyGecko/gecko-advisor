/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * User interface matching the backend User model
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  subscription: 'FREE' | 'PRO' | 'TEAM';
  subscriptionStatus?: string;
}

/**
 * Authentication context interface
 * Provides user state and authentication methods
 */
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  createAccount: (email: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';
const API_BASE = '/api/auth';

/**
 * AuthProvider Component
 * Manages authentication state and provides auth methods to the app
 *
 * Features:
 * - Persistent login via localStorage
 * - Auto-load user on mount if token exists
 * - Handle token expiration (401 errors)
 * - Centralized error handling
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch current user data from /api/auth/me
   * Called on mount if token exists
   */
  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Token expired or invalid
        if (response.status === 401) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setToken(null);
          setUser(null);
          return;
        }
        throw new Error('Failed to fetch user');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('[Auth] Failed to fetch user:', error);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  /**
   * Auto-load user on mount if token exists
   */
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  /**
   * Create a new account with just email (quick start)
   * POST /api/auth/create-account
   * Auto-login after successful creation
   */
  const createAccount = useCallback(async (email: string) => {
    try {
      const response = await fetch(`${API_BASE}/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create account');
      }

      const data = await response.json();
      const authToken = data.token;

      // Store token and fetch user data
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      setToken(authToken);
      await fetchUser(authToken);
    } catch (error) {
      console.error('[Auth] Create account failed:', error);
      throw error;
    }
  }, [fetchUser]);

  /**
   * Register a new account with email, password, and optional name
   * POST /api/auth/register
   * Auto-login after successful registration
   */
  const register = useCallback(async (email: string, password: string, name?: string) => {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to register');
      }

      const data = await response.json();
      const authToken = data.token;

      // Store token and fetch user data
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      setToken(authToken);
      await fetchUser(authToken);
    } catch (error) {
      console.error('[Auth] Registration failed:', error);
      throw error;
    }
  }, [fetchUser]);

  /**
   * Login with email and password
   * POST /api/auth/login
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Invalid email or password');
      }

      const data = await response.json();
      const authToken = data.token;

      // Store token and fetch user data
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      setToken(authToken);
      await fetchUser(authToken);
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  }, [fetchUser]);

  /**
   * Logout user and clear stored token
   */
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    createAccount,
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth Hook
 * Access authentication context from any component
 *
 * @throws Error if used outside AuthProvider
 * @example
 * const { user, login, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
