/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from '../config/branding';

export interface HeaderProps {
  onShowLogin?: () => void;
  onShowSignup?: () => void;
}

/**
 * Header Component - PrivacyGecko Branding
 * Top navigation bar with authentication state and PrivacyGecko branding
 *
 * Features:
 * - PrivacyGecko logo and Gecko Advisor branding
 * - Navigation links
 * - Login/Signup buttons for guest users
 * - User dropdown menu for authenticated users
 * - Pro badge for Pro users
 * - Dropdown menu with Dashboard, Settings, Logout
 * - Responsive mobile design
 *
 * @example
 * <Header
 *   onShowLogin={() => setShowLoginModal(true)}
 *   onShowSignup={() => setShowSignupModal(true)}
 * />
 */
export default function Header({ onShowLogin, onShowSignup }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    navigate('/');
  };

  const isPro = user?.subscription === 'PRO' || user?.subscription === 'TEAM';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - PrivacyGecko Branding */}
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
              aria-label="Gecko Advisor Home"
            >
              {/* Gecko Logo */}
              <span
                className="text-4xl leading-none select-none"
                role="img"
                aria-label={BRAND.logo.alt}
              >
                {BRAND.logo.emoji}
              </span>

              {/* Brand Text */}
              <div className="hidden sm:flex flex-col">
                <span className="text-xl font-bold text-gray-900 leading-tight">
                  {BRAND.productName}
                </span>
                <span className="text-xs text-emerald-600 font-medium leading-tight">
                  by {BRAND.companyName}
                </span>
              </div>

              {/* Mobile - Product Name Only */}
              <span className="sm:hidden text-lg font-bold text-gray-900">
                {BRAND.productName}
              </span>
            </Link>

            {/* Navigation links */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link
                to="/"
                className="text-gray-600 hover:text-emerald-600 transition-colors font-medium"
              >
                Home
              </Link>
              <Link
                to="/docs"
                className="text-gray-600 hover:text-emerald-600 transition-colors font-medium"
              >
                Docs
              </Link>
              <Link
                to="/about"
                className="text-gray-600 hover:text-emerald-600 transition-colors font-medium"
              >
                About
              </Link>
              <Link
                to="/pricing"
                className="text-gray-600 hover:text-emerald-600 transition-colors font-medium"
              >
                Pricing
              </Link>
            </div>
          </div>

          {/* Auth section */}
          <div className="flex items-center gap-3">
            {user ? (
              // Authenticated user dropdown
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg',
                    'text-sm font-medium text-gray-700',
                    'hover:bg-gray-100 transition-colors',
                    'border border-gray-200'
                  )}
                >
                  {/* User avatar/icon */}
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* User email and badge */}
                  <div className="hidden sm:flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-sm max-w-[150px] truncate">{user.email}</span>
                      {isPro && (
                        <span className="px-1.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded">
                          PRO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dropdown arrow */}
                  <svg
                    className={clsx(
                      'w-4 h-4 text-gray-500 transition-transform',
                      isDropdownOpen && 'rotate-180'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {user.subscription} {isPro && '✨'}
                      </p>
                    </div>

                    {/* Menu items */}
                    <Link
                      to="/dashboard"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Dashboard
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>

                    {!isPro && (
                      <Link
                        to="/pricing"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Upgrade to Pro
                      </Link>
                    )}

                    <hr className="my-1 border-gray-100" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Guest user buttons
              <div className="flex items-center gap-2">
                <button
                  onClick={onShowLogin}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium',
                    'text-gray-700 hover:bg-gray-100',
                    'transition-colors border border-gray-300'
                  )}
                  aria-label="Log in to your account"
                >
                  Log In
                </button>
                <button
                  onClick={onShowSignup}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-semibold',
                    'bg-emerald-600 text-white',
                    'hover:bg-emerald-700 active:bg-emerald-800',
                    'transition-colors shadow-sm hover:shadow-md'
                  )}
                  aria-label="Create a free account"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
