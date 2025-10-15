/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
 * - Navigation links (desktop and mobile)
 * - Mobile hamburger menu with slide-out drawer
 * - Login/Signup buttons for guest users
 * - User dropdown menu for authenticated users
 * - Pro badge for Pro users
 * - Dropdown menu with Dashboard, Settings, Logout
 * - Fully responsive with mobile drawer navigation
 * - Accessibility compliant (focus trap, ARIA labels, keyboard navigation)
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
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle mobile menu: Escape key and body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent body scroll

      // Focus trap: focus first focusable element in drawer
      if (mobileMenuRef.current) {
        const focusableElements = mobileMenuRef.current.querySelectorAll(
          'button, a, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleMobileNavClick = () => {
    setMobileMenuOpen(false);
  };

  const handleMobileAuthClick = (callback?: () => void) => {
    setMobileMenuOpen(false);
    callback?.();
  };

  const isPro = user?.subscription === 'PRO' || user?.subscription === 'TEAM';

  /**
   * Check if a route is active
   */
  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - PrivacyGecko Branding */}
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center group hover:opacity-80 transition-opacity"
              aria-label="Gecko Advisor Home"
            >
              {/* Gecko Logo */}
              <img
                src={BRAND.logo.src}
                alt={BRAND.logo.alt}
                className="h-14 w-auto object-contain"
              />
            </Link>

            {/* Navigation links */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link
                to="/"
                className="text-gray-600 hover:text-gecko-600 transition-colors font-medium"
              >
                Home
              </Link>
              <Link
                to="/docs"
                className="text-gray-600 hover:text-gecko-600 transition-colors font-medium"
              >
                Docs
              </Link>
              <Link
                to="/about"
                className="text-gray-600 hover:text-gecko-600 transition-colors font-medium"
              >
                About
              </Link>
              <Link
                to="/pricing"
                className="text-gray-600 hover:text-gecko-600 transition-colors font-medium"
              >
                Pricing
              </Link>
            </div>
          </div>

          {/* Auth section */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gecko-50 transition-colors"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

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
                    'bg-gecko-600 text-white',
                    'hover:bg-gecko-700 active:bg-gecko-800',
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

      {/* Mobile Menu Overlay */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden',
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Menu Drawer */}
      <div
        ref={mobileMenuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={clsx(
          'fixed top-0 right-0 h-full w-4/5 max-w-[320px] bg-white z-50 shadow-2xl transition-transform duration-300 ease-in-out md:hidden',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {/* Gecko Logo */}
          <img
            src={BRAND.logo.src}
            alt={BRAND.logo.alt}
            className="h-10 w-auto object-contain"
          />

          {/* Close Button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex flex-col h-full overflow-y-auto pb-20">
          {/* Navigation Links */}
          <nav className="flex flex-col py-2">
            <Link
              to="/"
              onClick={handleMobileNavClick}
              className={clsx(
                'py-3 px-4 text-base font-medium transition-colors',
                isActiveRoute('/')
                  ? 'text-gecko-600 bg-gecko-50 border-l-4 border-gecko-600'
                  : 'text-gray-700 hover:bg-gecko-50 hover:text-gecko-600'
              )}
            >
              Home
            </Link>
            <Link
              to="/docs"
              onClick={handleMobileNavClick}
              className={clsx(
                'py-3 px-4 text-base font-medium transition-colors',
                isActiveRoute('/docs')
                  ? 'text-gecko-600 bg-gecko-50 border-l-4 border-gecko-600'
                  : 'text-gray-700 hover:bg-gecko-50 hover:text-gecko-600'
              )}
            >
              Docs
            </Link>
            <Link
              to="/pricing"
              onClick={handleMobileNavClick}
              className={clsx(
                'py-3 px-4 text-base font-medium transition-colors',
                isActiveRoute('/pricing')
                  ? 'text-gecko-600 bg-gecko-50 border-l-4 border-gecko-600'
                  : 'text-gray-700 hover:bg-gecko-50 hover:text-gecko-600'
              )}
            >
              Pricing
            </Link>
            <Link
              to="/about"
              onClick={handleMobileNavClick}
              className={clsx(
                'py-3 px-4 text-base font-medium transition-colors',
                isActiveRoute('/about')
                  ? 'text-gecko-600 bg-gecko-50 border-l-4 border-gecko-600'
                  : 'text-gray-700 hover:bg-gecko-50 hover:text-gecko-600'
              )}
            >
              About
            </Link>
          </nav>

          {/* Divider */}
          <hr className="my-2 border-gray-200" />

          {/* Auth Section */}
          {user ? (
            // Authenticated User
            <div className="flex flex-col py-2">
              {/* User Info */}
              <div className="px-4 py-3 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-base font-semibold text-blue-600">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      {user.subscription}
                      {isPro && (
                        <span className="px-1.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded">
                          PRO
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* User Menu Items */}
              <Link
                to="/dashboard"
                onClick={handleMobileNavClick}
                className={clsx(
                  'flex items-center gap-3 py-3 px-4 text-base font-medium transition-colors',
                  isActiveRoute('/dashboard')
                    ? 'text-gecko-600 bg-gecko-50 border-l-4 border-gecko-600'
                    : 'text-gray-700 hover:bg-gecko-50 hover:text-gecko-600'
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 py-3 px-4 text-base font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </button>
            </div>
          ) : (
            // Guest User
            <div className="flex flex-col gap-3 p-4">
              <button
                onClick={() => handleMobileAuthClick(onShowLogin)}
                className={clsx(
                  'w-full py-3 px-4 rounded-lg text-base font-medium',
                  'text-gray-700 bg-white border-2 border-gray-300',
                  'hover:bg-gray-50 transition-colors'
                )}
              >
                Log In
              </button>
              <button
                onClick={() => handleMobileAuthClick(onShowSignup)}
                className={clsx(
                  'w-full py-3 px-4 rounded-lg text-base font-semibold',
                  'bg-gecko-600 text-white',
                  'hover:bg-gecko-700 active:bg-gecko-800',
                  'transition-colors shadow-sm'
                )}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
