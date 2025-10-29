/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState } from 'react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
  onForgotPassword?: (email?: string) => void;
}

/**
 * LoginModal Component
 * Modal dialog for user authentication
 *
 * Features:
 * - Email and password inputs
 * - Form validation
 * - Error handling with inline messages
 * - Loading states
 * - Link to signup modal
 * - Auto-close on successful login
 *
 * @example
 * <LoginModal
 *   isOpen={showLogin}
 *   onClose={() => setShowLogin(false)}
 *   onSwitchToSignup={() => { setShowLogin(false); setShowSignup(true); }}
 * />
 */
export default function LoginModal({ isOpen, onClose, onSwitchToSignup, onForgotPassword }: LoginModalProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back!');
      onClose();
      // Reset form
      setEmail('');
      setPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to login';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      setEmail('');
      setPassword('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Log In</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Email input */}
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className={clsx(
                'w-full px-3 py-2 border rounded-lg text-base',
                'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent',
                'disabled:bg-gray-100 disabled:cursor-not-allowed',
                'transition-colors'
              )}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          {/* Password input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              {onForgotPassword && (
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  onClick={() => onForgotPassword(email)}
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className={clsx(
                'w-full px-3 py-2 border rounded-lg text-base',
                'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent',
                'disabled:bg-gray-100 disabled:cursor-not-allowed',
                'transition-colors'
              )}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className={clsx(
              'w-full px-4 py-3 rounded-lg font-semibold text-white',
              'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
              'disabled:bg-gray-300 disabled:cursor-not-allowed',
              'transition-all duration-200',
              'shadow-md hover:shadow-lg',
              'flex items-center justify-center gap-2'
            )}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Signup link */}
        <div className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          {onSwitchToSignup ? (
            <button
              onClick={onSwitchToSignup}
              disabled={isLoading}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
            >
              Sign Up
            </button>
          ) : (
            <span className="text-blue-600 font-medium">Sign Up</span>
          )}
        </div>
      </div>
    </div>
  );
}
