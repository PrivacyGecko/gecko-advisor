/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef, useEffect } from 'react';

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

  // If Turnstile is disabled (no site key), call onSuccess with empty token
  // Move this side effect to useEffect to avoid calling it during render
  useEffect(() => {
    if (!siteKey) {
      onSuccess('');
    }
  }, [siteKey, onSuccess]);

  // If Turnstile is disabled (no site key), render nothing
  if (!siteKey) {
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
