import type { NextFunction, Request, Response } from 'express';

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const sendApiError = (res: Response, statusCode: number, code: string, message: string, details?: unknown) =>
  res.status(statusCode).json({ error: { code, message, details } } satisfies ApiErrorPayload);

export const notFoundHandler = (_req: Request, res: Response) => sendApiError(res, 404, 'NOT_FOUND', 'Endpoint not found');

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApiError) {
    return sendApiError(res, error.statusCode, error.code, error.message, error.details);
  }

  console.error('[api] unhandled error', error);
  return sendApiError(res, 500, 'INTERNAL_ERROR', 'Unexpected server error');
};
