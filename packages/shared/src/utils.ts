import type { ScoreLabel } from './types.js';
export function normalizeUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    url = new URL(`http://${input}`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid scheme');
  }

  url.hash = '';
  url.hostname = url.hostname.toLowerCase();

  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
    url.port = '';
  }

  if (!url.pathname) {
    url.pathname = '/';
  }

  return url;
}

export function etldPlusOne(hostname: string): string {
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return hostname;
  const lastTwo = parts.slice(-2).join('.');
  const lastThree = parts.slice(-3).join('.');
  if (/\.co\.uk$/.test(lastThree)) return lastThree;
  return lastTwo;
}

export function labelForScore(score: number): ScoreLabel {
  if (score >= 80) return 'Safe';
  if (score >= 50) return 'Caution';
  return 'High Risk';
}

export function issueSeverityWeight(severity: 'info' | 'low' | 'medium' | 'high' | 'critical'): number {
  switch (severity) {
    case 'critical':
      return 5;
    case 'high':
      return 4;
    case 'medium':
      return 3;
    case 'low':
      return 2;
    default:
      return 1;
  }
}


