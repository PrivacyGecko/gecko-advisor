import { describe, it, expect } from 'vitest';
import { normalizeUrl, labelForScore } from './utils';

describe('normalizeUrl', () => {
  it('adds http scheme if missing', () => {
    const u = normalizeUrl('example.com');
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
