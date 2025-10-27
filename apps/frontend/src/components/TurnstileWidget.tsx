/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef } from 'react';

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

/**
 * Cloudflare Turnstile bot protection widget
 *
 * This component renders an invisible CAPTCHA challenge
 * that automatically verifies users in the background.
 */
export default function TurnstileWidget({ onSuccess, onError, onExpire }: TurnstileWidgetProps) {
  const turnstileRef = useRef<TurnstileInstance>(null);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  // If Turnstile is disabled (no site key), render nothing
  // and immediately call onSuccess with empty token
  if (!siteKey) {
    // Call onSuccess with empty token to indicate no Turnstile check
    setTimeout(() => onSuccess(''), 0);
    return null;
  }

  return (
    <div className="turnstile-container">
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        options={{
          theme: 'light',
          size: 'invisible', // Invisible widget - no UI needed
          action: 'scan',
          appearance: 'interaction-only',
        }}
        onSuccess={onSuccess}
        onError={() => {
          console.warn('[Turnstile] Verification failed');
          onError?.();
        }}
        onExpire={() => {
          console.warn('[Turnstile] Token expired');
          onExpire?.();
        }}
      />
    </div>
  );
}

/**
 * Hook to check if Turnstile is enabled
 */
export function useTurnstileEnabled(): boolean {
  return Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
}
