/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin?: () => void;
  defaultEmail?: string;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onBackToLogin,
  defaultEmail = '',
}: ForgotPasswordModalProps) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState(defaultEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      setIsSubmitted(false);
      setError(null);
    }
  }, [isOpen, defaultEmail]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!isLoading) {
      setEmail(defaultEmail);
      setIsSubmitted(false);
      setError(null);
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setIsSubmitted(true);
      toast.success('Check your email for the reset link');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send reset email';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
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

        {isSubmitted ? (
          <div className="space-y-4 text-sm text-gray-700">
            <p className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg">
              If an account exists for <strong>{email}</strong>, we just sent a link to reset your password.
            </p>
            <p>
              It may take a minute to arrive. Be sure to check your spam folder if you don’t see it.
            </p>
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="forgot-email"
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
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            {onBackToLogin && (
              <div className="text-center text-sm text-gray-600">
                Remembered your password?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  onClick={() => {
                    handleClose();
                    onBackToLogin();
                  }}
                >
                  Log in
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
