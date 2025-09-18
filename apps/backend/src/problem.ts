import type { Response } from 'express';

export function problem(res: Response, status: number, title: string, detail?: unknown) {
  return res.status(status).type('application/problem+json').json({
    type: 'about:blank',
    title,
    status,
    detail,
  });
}
