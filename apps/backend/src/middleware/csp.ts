import type { RequestHandler } from "express";
import { randomBytes } from "node:crypto";

const keywordDirectives = new Set(['self', 'none', 'unsafe-inline']);

function normalizeValue(value: string): string {
  if (!value) {
    return value;
  }
  if (value.startsWith("'")) {
    return value;
  }
  if (keywordDirectives.has(value)) {
    return `'${value}'`;
  }
  if (value.startsWith('nonce-') || value.startsWith('sha256-')) {
    return `'${value}'`;
  }
  return value;
}

function buildDirectiveLine(name: string, values: string[] = []): string {
  const normalized = values
    .map(normalizeValue)
    .filter((value) => value && value.length > 0);
  if (normalized.length === 0) {
    return name;
  }
  return `${name} ${normalized.join(' ')}`;
}

export interface CspOptions {
  connectSources: string[];
  imageSources: string[];
  reportUri?: string;
}

export const withCsp = ({ connectSources, imageSources, reportUri }: CspOptions): RequestHandler => {
  return (_req, res, next) => {
    const nonce = randomBytes(16).toString('base64');
    const scriptNonce = `nonce-${nonce}`;
    const directives = [
      buildDirectiveLine('default-src', ['none']),
      buildDirectiveLine('base-uri', ['none']),
      buildDirectiveLine('script-src', ['self', scriptNonce]),
      buildDirectiveLine('style-src', ['self', 'unsafe-inline']),
      buildDirectiveLine('img-src', imageSources),
      buildDirectiveLine('connect-src', connectSources),
      buildDirectiveLine('font-src', ['self']),
      buildDirectiveLine('frame-ancestors', ['none']),
      buildDirectiveLine('object-src', ['none']),
      buildDirectiveLine('form-action', ['self']),
      buildDirectiveLine('upgrade-insecure-requests'),
      reportUri ? buildDirectiveLine('report-uri', [reportUri]) : undefined,
    ].filter((line): line is string => Boolean(line));

    res.locals.cspNonce = nonce;
    res.setHeader('Content-Security-Policy', directives.join('; '));
    next();
  };
};
