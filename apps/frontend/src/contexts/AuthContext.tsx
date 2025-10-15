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
 * Wallet state interface
 */
export interface WalletState {
  connected: boolean;
  connecting: boolean;
  address?: string;
}

/**
 * Authentication context interface
 * Provides user state and authentication methods
 */
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  wallet: WalletState;
  createAccount: (email: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loginWithWallet: (walletAddress: string, signature: string, message: string) => Promise<void>;
  linkWallet: (walletAddress: string, signature: string, message: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
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
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    connecting: false,
  });

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
      setUser(userData.user);
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

      // Check wallet status
      fetch('/api/wallet/status', {
        headers: { 'Authorization': `Bearer ${storedToken}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.connected && data.address) {
            setWalletState({
              connected: true,
              connecting: false,
              address: data.address,
            });
          }
        })
        .catch(() => {
          // Silently fail - wallet status is optional
        });
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
    setWalletState({ connected: false, connecting: false });
  }, []);

  /**
   * Login with wallet authentication
   * POST /api/wallet/verify
   * Verifies wallet signature and logs in the user
   */
  const loginWithWallet = useCallback(async (walletAddress: string, signature: string, message: string) => {
    try {
      setWalletState(prev => ({ ...prev, connecting: true }));

      const response = await fetch('/api/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature, message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Wallet authentication failed');
      }

      const data = await response.json();
      const authToken = data.token;

      // Store token and update state
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      setToken(authToken);
      setUser(data.user);
      setWalletState({
        connected: true,
        connecting: false,
        address: walletAddress,
      });
    } catch (error) {
      console.error('[Auth] Wallet login failed:', error);
      setWalletState({ connected: false, connecting: false });
      throw error;
    }
  }, []);

  /**
   * Link wallet to existing account
   * POST /api/wallet/link
   * Requires existing authentication
   */
  const linkWallet = useCallback(async (walletAddress: string, signature: string, message: string) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      setWalletState(prev => ({ ...prev, connecting: true }));

      const response = await fetch('/api/wallet/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress, signature, message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Wallet linking failed');
      }

      setWalletState({
        connected: true,
        connecting: false,
        address: walletAddress,
      });

      // Refresh user data
      await fetchUser(token);
    } catch (error) {
      console.error('[Auth] Wallet linking failed:', error);
      setWalletState(prev => ({ ...prev, connecting: false }));
      throw error;
    }
  }, [token, fetchUser]);

  /**
   * Disconnect wallet from account
   * POST /api/wallet/disconnect
   */
  const disconnectWallet = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      await fetch('/api/wallet/disconnect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setWalletState({ connected: false, connecting: false });
    } catch (error) {
      console.error('[Auth] Failed to disconnect wallet:', error);
      throw error;
    }
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    wallet: walletState,
    createAccount,
    register,
    login,
    logout,
    loginWithWallet,
    linkWallet,
    disconnectWallet,
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
