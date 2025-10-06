import type { Response } from 'express';

/**
 * Safely sanitizes error details to prevent information disclosure.
 * Removes stack traces, file paths, and other sensitive information.
 */
function sanitizeErrorDetail(detail: unknown, isProduction: boolean): unknown {
  if (!detail) return undefined;

  // In production, never expose detailed error information
  if (isProduction) {
    return undefined;
  }

  // In development, sanitize but keep some information for debugging
  if (typeof detail === 'string') {
    // Remove file paths and stack traces
    return detail
      .replace(/\/[^\s]+\.(js|ts|json)/g, '[FILE_PATH]')
      .replace(/at [^\s]+\.[^\s]+:\d+:\d+/g, '[STACK_TRACE]')
      .replace(/Error: /g, '')
      .substring(0, 200); // Limit length
  }

  if (detail instanceof Error) {
    // Only return sanitized message, never stack trace
    return detail.message
      .replace(/\/[^\s]+\.(js|ts|json)/g, '[FILE_PATH]')
      .substring(0, 200);
  }

  if (typeof detail === 'object' && detail !== null) {
    // Remove potentially sensitive fields
    const sanitized = { ...detail } as Record<string, unknown>;
    delete sanitized.stack;
    delete sanitized.trace;
    delete sanitized.path;
    delete sanitized.filename;
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.key;
    delete sanitized.secret;

    return sanitized;
  }

  return undefined;
}

/**
 * Creates a RFC7807 compliant problem response with secure error handling.
 * Automatically sanitizes error details to prevent information disclosure.
 */
export function problem(res: Response, status: number, title: string, detail?: unknown) {
  const isProduction = process.env.NODE_ENV === 'production';
  const sanitizedDetail = sanitizeErrorDetail(detail, isProduction);

  const response: Record<string, unknown> = {
    type: 'about:blank',
    title,
    status,
  };

  if (sanitizedDetail) {
    response.detail = sanitizedDetail;
  }

  return res.status(status).type('application/problem+json').json(response);
}
