import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

export const requestId: RequestHandler = (req, res, next) => {
  const headerId = Array.isArray(req.headers['x-request-id'])
    ? req.headers['x-request-id'][0]
    : req.headers['x-request-id'];
  const id = typeof headerId === 'string' && headerId.trim().length > 0 ? headerId : randomUUID();
  res.locals.requestId = id;
  res.setHeader('x-request-id', id);
  next();
};
