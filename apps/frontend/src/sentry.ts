import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;
const stageTag = import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE;
const tracesSampleRate = Number.parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1');

export const sentryEnabled = Boolean(dsn);

if (dsn) {
  Sentry.init({
    dsn,
    environment: stageTag,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
  });
  Sentry.setTag('stage', stageTag);
  Sentry.setTag('service', 'frontend');
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
export const captureException = Sentry.captureException;

export function useSentryRouteTags(extra: Record<string, string | undefined> = {}) {
  const location = useLocation();

  useEffect(() => {
    if (!sentryEnabled) return;
    Sentry.setTag('route', location.pathname);
    for (const [key, value] of Object.entries(extra)) {
      Sentry.setTag(key, value ?? '');
    }
  }, [location.pathname, serialize(extra)]);
}

function serialize(value: Record<string, string | undefined>): string {
  return JSON.stringify(Object.entries(value).filter(([, v]) => v !== undefined));
}






