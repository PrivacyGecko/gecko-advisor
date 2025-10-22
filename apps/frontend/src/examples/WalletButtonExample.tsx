/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * WalletButton Usage Example
 *
 * This file demonstrates how to integrate the WalletButton component
 * into your application with the required providers.
 */

import React from 'react';
import { WalletButton } from '../components/WalletButton';
import { WalletProvider } from '../contexts/WalletProvider';
import { AuthProvider } from '../contexts/AuthContext';

/**
 * Example 1: Basic Usage
 * Place WalletButton in your header or navigation
 */
export function BasicWalletButtonExample() {
  return (
    <div className="flex items-center gap-3">
      <WalletButton />
    </div>
  );
}

/**
 * Example 2: Full Button on Mobile
 * By default, WalletButton shows icon-only on mobile.
 * Use showFullButtonOnMobile prop to show full text.
 */
export function FullButtonOnMobileExample() {
  return (
    <div className="flex items-center gap-3">
      <WalletButton showFullButtonOnMobile />
    </div>
  );
}

/**
 * Example 3: Custom Styling
 * Add custom classes to match your design
 */
export function CustomStyledExample() {
  return (
    <div className="flex items-center gap-3">
      <WalletButton className="shadow-lg border-2" />
    </div>
  );
}

/**
 * Example 4: Complete Integration in App
 * Ensure WalletButton is wrapped with required providers:
 * 1. AuthProvider - for wallet authentication state
 * 2. WalletProvider - for Solana wallet adapter
 */
export function CompleteAppExample() {
  return (
    <AuthProvider>
      <WalletProvider>
        <div className="min-h-screen">
          {/* Your app header */}
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold">Gecko Advisor</div>
                <WalletButton />
              </div>
            </div>
          </header>

          {/* Your app content */}
          <main className="max-w-7xl mx-auto px-4 py-8">
            <h1>Your App Content</h1>
          </main>
        </div>
      </WalletProvider>
    </AuthProvider>
  );
}

/**
 * Example 5: Integration with Existing Header
 * Add WalletButton to your existing Header component
 */
export function HeaderIntegrationExample() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and navigation */}
          <div className="flex items-center gap-8">
            <div className="text-xl font-bold">Gecko Advisor</div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="/">Home</a>
              <a href="/docs">Docs</a>
              <a href="/about">About</a>
            </nav>
          </div>

          {/* Wallet button in header */}
          <div className="flex items-center gap-3">
            <WalletButton />
          </div>
        </div>
      </nav>
    </header>
  );
}

/**
 * Example 6: Accessing Wallet State
 * Use useAuth hook to access wallet connection state
 */
export function WalletStateExample() {
  // This would be inside a component
  const exampleCode = `
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { wallet, user } = useAuth();

  return (
    <div>
      {wallet.connected && wallet.address && (
        <div>
          <p>Wallet Connected: {wallet.address}</p>
          <p>User: {user?.email}</p>
        </div>
      )}
      {!wallet.connected && (
        <p>Please connect your wallet</p>
      )}
    </div>
  );
}
  `;

  return (
    <div>
      <h2>Accessing Wallet State</h2>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
        <code>{exampleCode}</code>
      </pre>
    </div>
  );
}

/**
 * Backend Integration Notes:
 *
 * The WalletButton automatically handles:
 * 1. GET /api/wallet/challenge/:address - Get challenge message
 * 2. POST /api/wallet/verify - Verify signature and authenticate
 *
 * Required backend endpoints:
 *
 * GET /api/wallet/challenge/:address
 * Response: { challenge: string }
 *
 * POST /api/wallet/verify
 * Body: { walletAddress: string, signature: string, message: string }
 * Response: { token: string, user: User }
 *
 * POST /api/wallet/link
 * Headers: Authorization: Bearer <token>
 * Body: { walletAddress: string, signature: string, message: string }
 * Response: { success: boolean }
 *
 * POST /api/wallet/disconnect
 * Headers: Authorization: Bearer <token>
 * Response: { success: boolean }
 */
