/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { clsx } from 'clsx';
import bs58 from 'bs58';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { truncateAddress } from '../lib/wallet';
import WalletDropdownMenu from './WalletDropdownMenu';

const WALLET_AUTH_ENABLED = import.meta.env.VITE_WALLET_AUTH_ENABLED !== 'false';

/**
 * WalletButton Component Props
 */
export interface WalletButtonProps {
  /** Additional CSS classes */
  className?: string;
  /** Show full button on mobile (default: false, shows icon only) */
  showFullButtonOnMobile?: boolean;
}

/**
 * WalletButton Component
 *
 * Primary wallet connection button for Gecko Advisor.
 * Integrates with Solana Wallet Adapter and AuthContext for wallet authentication.
 *
 * Three states:
 * 1. **Not connected**: Shows "Connect Wallet" button with wallet icon
 * 2. **Connecting**: Shows loading spinner
 * 3. **Connected**: Shows truncated address with dropdown menu
 *
 * Features:
 * - Solana wallet connection via @solana/wallet-adapter-react
 * - Sign message for authentication with backend
 * - Automatic wallet linking after signature
 * - Dropdown menu when connected (copy address, disconnect)
 * - Responsive design (full button on desktop, optional icon-only on mobile)
 * - Error handling with toast notifications
 * - WCAG AA accessible
 *
 * @example
 * <WalletButton />
 * <WalletButton className="ml-4" showFullButtonOnMobile />
 */
export const WalletButton: React.FC<WalletButtonProps> = ({
  className,
  showFullButtonOnMobile = false,
}) => {
  if (!WALLET_AUTH_ENABLED) {
    return null;
  }
  const { wallet, connect, disconnect, connecting, publicKey, signMessage } = useWallet();
  const { setVisible } = useWalletModal();
  const { wallet: walletState, loginWithWallet, user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
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

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (publicKey && !walletState.connected && !isAuthenticating && signMessage) {
      handleAuthentication();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, walletState.connected]);

  /**
   * Handle wallet connection
   * Shows wallet selection modal if no wallet is selected
   */
  const handleConnect = async () => {
    try {
      if (!wallet) {
        setVisible(true); // Show wallet selection modal
      } else {
        await connect();
      }
    } catch (error) {
      console.error('[WalletButton] Connection failed:', error);
      toast.error('Failed to connect wallet', {
        duration: 3000,
        position: 'bottom-center',
      });
    }
  };

  /**
   * Handle wallet authentication with backend
   * 1. Get challenge from backend
   * 2. Sign message with wallet
   * 3. Verify signature with backend
   */
  const handleAuthentication = async () => {
    if (!publicKey || !signMessage) {
      console.error('[WalletButton] Missing publicKey or signMessage');
      return;
    }

    setIsAuthenticating(true);

    try {
      // Step 1: Get challenge from backend
      const challengeRes = await fetch(`/api/wallet/challenge/${publicKey.toBase58()}`, {
        method: 'POST',
      });

      if (!challengeRes.ok) {
        throw new Error('Failed to get challenge from backend');
      }

      const { challenge } = await challengeRes.json();

      // Step 2: Sign message with wallet
      const encodedMessage = new TextEncoder().encode(challenge);
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);

      // Step 3: Authenticate with backend
      await loginWithWallet(publicKey.toBase58(), signatureBase58, challenge);

      toast.success('Wallet connected successfully!', {
        duration: 3000,
        position: 'bottom-center',
      });
    } catch (error) {
      console.error('[WalletButton] Authentication failed:', error);

      // Disconnect wallet on auth failure
      await disconnect();

      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to authenticate wallet',
        {
          duration: 4000,
          position: 'bottom-center',
        }
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  /**
   * Handle wallet disconnection
   * Disconnects from Solana wallet and clears auth state
   */
  const handleDisconnect = async () => {
    try {
      await disconnect();
      setIsDropdownOpen(false);
      toast.success('Wallet disconnected', {
        duration: 2000,
        position: 'bottom-center',
      });
    } catch (error) {
      console.error('[WalletButton] Disconnect failed:', error);
      toast.error('Failed to disconnect wallet', {
        duration: 3000,
        position: 'bottom-center',
      });
    }
  };

  // Loading state (connecting or authenticating)
  if (connecting || isAuthenticating) {
    return (
      <button
        disabled
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-lg',
          'text-sm font-medium text-gray-700 bg-gray-100',
          'border border-gray-300 cursor-not-allowed',
          showFullButtonOnMobile ? '' : 'sm:px-4 px-3',
          className
        )}
        aria-label="Connecting wallet"
      >
        {/* Loading Spinner */}
        <svg
          className="w-4 h-4 animate-spin text-gecko-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className={showFullButtonOnMobile ? '' : 'hidden sm:inline'}>
          {isAuthenticating ? 'Authenticating...' : 'Connecting...'}
        </span>
      </button>
    );
  }

  // Connected state - show dropdown button
  if (publicKey && walletState.connected) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'text-sm font-medium text-gray-700',
            'hover:bg-gray-100 transition-colors',
            'border border-gray-200',
            showFullButtonOnMobile ? '' : 'sm:px-3 px-2',
            className
          )}
          aria-label="Wallet menu"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          {/* Wallet Icon */}
          <svg
            className="w-5 h-5 text-gecko-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>

          {/* Wallet Address */}
          <span className={showFullButtonOnMobile ? '' : 'hidden sm:inline'}>
            {truncateAddress(publicKey.toBase58())}
          </span>

          {/* Dropdown Arrow */}
          <svg
            className={clsx(
              'w-4 h-4 text-gray-500 transition-transform',
              showFullButtonOnMobile ? '' : 'hidden sm:block',
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

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <WalletDropdownMenu
            address={publicKey.toBase58()}
            onDisconnect={handleDisconnect}
          />
        )}
      </div>
    );
  }

  // Not connected state - show connect button
  return (
    <button
      onClick={handleConnect}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-lg',
        'text-sm font-semibold text-white',
        'bg-gecko-600 hover:bg-gecko-700 active:bg-gecko-800',
        'transition-colors shadow-sm hover:shadow-md',
        showFullButtonOnMobile ? '' : 'sm:px-4 px-3',
        className
      )}
      aria-label="Connect wallet"
    >
      {/* Wallet Icon */}
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
      <span className={showFullButtonOnMobile ? '' : 'hidden sm:inline'}>
        Connect Wallet
      </span>
    </button>
  );
};

export default WalletButton;
