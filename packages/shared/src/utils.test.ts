import { describe, it, expect } from 'vitest';
import { normalizeUrl, labelForScore } from './utils.js';

describe('normalizeUrl', () => {
  it('defaults to https scheme if missing', () => {
    const u = normalizeUrl('example.com');
    expect(u.protocol).toBe('https:');
  });
  it('preserves explicit http scheme', () => {
    const u = normalizeUrl('http://example.com');
    expect(u.protocol).toBe('http:');
  });
  it('strips hash and default ports', () => {
    const u = normalizeUrl('https://example.com:443/#x');
    expect(u.href).toBe('https://example.com/');
  });
});

describe('labelForScore', () => {
  it('labels correctly', () => {
    expect(labelForScore(85)).toBe('Safe');
    expect(labelForScore(60)).toBe('Caution');
    expect(labelForScore(10)).toBe('High Risk');
  });
});
