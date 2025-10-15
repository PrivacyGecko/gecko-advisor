/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState } from 'react';
import { clsx } from 'clsx';
import { copyToClipboard, truncateAddress } from '../lib/wallet';

/**
 * WalletDropdownMenu Component Props
 */
export interface WalletDropdownMenuProps {
  /** Full wallet address */
  address: string;
  /** Callback when disconnect is clicked */
  onDisconnect: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * WalletDropdownMenu Component
 *
 * Dropdown menu displayed when wallet is connected.
 * Shows wallet address with copy functionality and disconnect option.
 *
 * Features:
 * - Display full and truncated wallet address
 * - Copy address to clipboard with visual feedback
 * - Disconnect wallet option
 * - Tailwind CSS styling consistent with app design
 * - Accessible keyboard navigation
 *
 * @example
 * <WalletDropdownMenu
 *   address="7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh8wCxXc8y1Q4"
 *   onDisconnect={handleDisconnect}
 * />
 */
export const WalletDropdownMenu: React.FC<WalletDropdownMenuProps> = ({
  address,
  onDisconnect,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(address, 'Wallet address copied');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={clsx(
        'absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50',
        className
      )}
      role="menu"
      aria-orientation="vertical"
      aria-label="Wallet menu"
    >
      {/* Wallet Address Section */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
        <div className="flex items-center gap-2">
          <p
            className="text-sm font-mono text-gray-900 truncate flex-1"
            title={address}
          >
            {truncateAddress(address, 6, 6)}
          </p>
        </div>
      </div>

      {/* Copy Address Option */}
      <button
        onClick={handleCopy}
        className={clsx(
          'flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors',
          copied
            ? 'text-gecko-600 bg-gecko-50'
            : 'text-gray-700 hover:bg-gray-50'
        )}
        role="menuitem"
        disabled={copied}
      >
        {copied ? (
          <>
            {/* Check Icon */}
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-medium">Copied!</span>
          </>
        ) : (
          <>
            {/* Copy Icon */}
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>Copy Address</span>
          </>
        )}
      </button>

      {/* Divider */}
      <hr className="my-1 border-gray-100" />

      {/* Disconnect Option */}
      <button
        onClick={onDisconnect}
        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
        role="menuitem"
      >
        {/* Disconnect Icon */}
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span>Disconnect</span>
      </button>
    </div>
  );
};

export default WalletDropdownMenu;
