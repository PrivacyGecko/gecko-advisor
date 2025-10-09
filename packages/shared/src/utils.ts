import type { ScoreLabel } from './types.js';
/**
 * Safely normalizes a URL input with proper validation to prevent SSRF attacks.
 * Only allows http and https protocols and validates hostname format.
 */
export function normalizeUrl(input: string): URL {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid URL input: must be a non-empty string');
  }

  // Trim and validate basic format
  const trimmedInput = input.trim();
  if (trimmedInput.length === 0 || trimmedInput.length > 2048) {
    throw new Error('Invalid URL input: empty or too long');
  }

  // Prevent dangerous protocols by checking for common bypass patterns
  const lowerInput = trimmedInput.toLowerCase();
  if (lowerInput.includes('javascript:') || lowerInput.includes('data:') ||
      lowerInput.includes('file:') || lowerInput.includes('ftp:') ||
      lowerInput.includes('mailto:') || lowerInput.includes('tel:')) {
    throw new Error('Invalid URL: dangerous protocol detected');
  }

  let url: URL;

  // First try to parse as-is
  try {
    url = new URL(trimmedInput);
  } catch {
    // Only if parsing fails, try adding http prefix
    // But first validate the input doesn't contain protocol separators that could be bypassed
    if (trimmedInput.includes('://') || trimmedInput.startsWith('//')) {
      throw new Error('Invalid URL format');
    }

    try {
      url = new URL(`http://${trimmedInput}`);
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  // Strict protocol validation
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid protocol: only http and https are allowed');
  }

  // Validate hostname format and prevent dangerous patterns
  if (!url.hostname || url.hostname.length === 0) {
    throw new Error('Invalid hostname: empty hostname not allowed');
  }

  // Prevent localhost and private network access for security
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.startsWith('169.254.') ||
      hostname.includes('..')) {
    throw new Error('Invalid hostname: private networks not allowed');
  }

  // Basic hostname format validation
  if (!/^[a-z0-9.-]+$/i.test(hostname) || hostname.includes('..')) {
    throw new Error('Invalid hostname format');
  }

  // Normalize the URL
  url.hash = '';
  url.hostname = hostname;

  // Normalize default ports
  if ((url.protocol === 'http:' && url.port === '80') ||
      (url.protocol === 'https:' && url.port === '443')) {
    url.port = '';
  }

  // Ensure pathname exists
  if (!url.pathname || url.pathname === '') {
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


