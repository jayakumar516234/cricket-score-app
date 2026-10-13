import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
    throw new HttpError(400, `${path}${issue.message}`, { fields: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  }
  return result.data;
}

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function pageParams(query, maxLimit = 100) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message || 'Invalid input' });
  if (err?.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  if (err?.code === 11000) return res.status(409).json({ error: 'A record with the same unique value already exists' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large (images must be small)' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
}
