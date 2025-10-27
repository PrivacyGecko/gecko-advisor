/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import toast from 'react-hot-toast';

/**
 * Wallet Utility Functions
 *
 * Helper functions for wallet address formatting, clipboard operations,
 * and wallet authentication flows.
 */

/**
 * Truncate a Solana wallet address for display
 *
 * @param address - Full Solana wallet address
 * @param startChars - Number of characters to show at start (default: 4)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Truncated address in format "7v91...y1Q4"
 *
 * @example
 * truncateAddress("7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh8wCxXc8y1Q4")
 * // Returns: "7v91...y1Q4"
 */
export function truncateAddress(
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Copy text to clipboard with toast notification
 *
 * Uses modern Clipboard API with fallback for older browsers.
 * Shows success/error toast notifications.
 *
 * @param text - Text to copy to clipboard
 * @param successMessage - Custom success message (optional)
 * @returns Promise that resolves when copy is complete
 *
 * @example
 * await copyToClipboard("7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh8wCxXc8y1Q4")
 * // Shows toast: "Address copied to clipboard"
 */
export async function copyToClipboard(
  text: string,
  successMessage: string = 'Copied to clipboard'
): Promise<void> {
  try {
    // Modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage, {
        duration: 2000,
        position: 'bottom-center',
      });
      return;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    textArea.remove();

    if (successful) {
      toast.success(successMessage, {
        duration: 2000,
        position: 'bottom-center',
      });
    } else {
      throw new Error('Copy command failed');
    }
  } catch (error) {
    console.error('[Wallet] Copy to clipboard failed:', error);
    toast.error('Failed to copy to clipboard', {
      duration: 2000,
      position: 'bottom-center',
    });
  }
}

/**
 * Format wallet address for display with copy functionality
 *
 * @param address - Full wallet address
 * @returns Object with full and truncated address
 *
 * @example
 * const { full, short } = formatWalletAddress("7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh8wCxXc8y1Q4")
 * // { full: "7v91...Q4", short: "7v91...Q4" }
 */
export function formatWalletAddress(address: string) {
  return {
    full: address,
    short: truncateAddress(address),
    medium: truncateAddress(address, 6, 6),
  };
}

/**
 * Validate Solana wallet address format
 *
 * Basic validation for Solana addresses (base58 encoded, 32-44 characters)
 *
 * @param address - Address to validate
 * @returns True if address appears valid
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address) return false;

  // Solana addresses are base58 encoded and typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}
