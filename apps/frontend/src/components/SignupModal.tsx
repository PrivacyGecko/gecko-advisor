/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState } from 'react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

type SignupMode = 'quick' | 'full';

/**
 * SignupModal Component
 * Modal dialog for user registration with two options
 *
 * Features:
 * - Quick signup (email only) - calls createAccount()
 * - Full signup (email, password, name) - calls register()
 * - Form validation
 * - Error handling with inline messages
 * - Loading states
 * - Link to login modal
 * - Auto-close on successful signup
 *
 * @example
 * <SignupModal
 *   isOpen={showSignup}
 *   onClose={() => setShowSignup(false)}
 *   onSwitchToLogin={() => { setShowSignup(false); setShowLogin(true); }}
 * />
 */
export default function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const { createAccount, register } = useAuth();
  const [mode, setMode] = useState<SignupMode>('quick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await createAccount(email);
      toast.success('Account created! Welcome to Privacy Advisor');
      onClose();
      // Reset form
      setEmail('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name || undefined);
      toast.success('Account created! Welcome to Privacy Advisor');
      onClose();
      // Reset form
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
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
      setName('');
      setMode('quick');
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
          <h2 className="text-2xl font-bold text-gray-900">Sign Up</h2>
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

        {/* Benefits */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">With an account you get:</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Scan history and saved results</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Easier upgrade to Pro for unlimited scans</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>API access for automated scanning</span>
            </li>
          </ul>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setMode('quick')}
            disabled={isLoading}
            className={clsx(
              'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all',
              mode === 'quick'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Quick Start
          </button>
          <button
            onClick={() => setMode('full')}
            disabled={isLoading}
            className={clsx(
              'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all',
              mode === 'full'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Full Account
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Quick signup form */}
        {mode === 'quick' && (
          <form onSubmit={handleQuickSignup} className="space-y-4">
            <div>
              <label htmlFor="quick-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="quick-email"
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
              <p className="text-xs text-gray-500 mt-1">
                We'll email you a link to set your password later
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}

        {/* Full signup form */}
        {mode === 'full' && (
          <form onSubmit={handleFullSignup} className="space-y-4">
            <div>
              <label htmlFor="full-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                id="full-email"
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

            <div>
              <label htmlFor="full-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                id="full-password"
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
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name (Optional)
              </label>
              <input
                id="full-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg text-base',
                  'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent',
                  'disabled:bg-gray-100 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}

        {/* Login link */}
        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          {onSwitchToLogin ? (
            <button
              onClick={onSwitchToLogin}
              disabled={isLoading}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
            >
              Log In
            </button>
          ) : (
            <span className="text-blue-600 font-medium">Log In</span>
          )}
        </div>
      </div>
    </div>
  );
}
