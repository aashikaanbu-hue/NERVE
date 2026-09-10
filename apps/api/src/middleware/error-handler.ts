import type { ErrorRequestHandler, RequestHandler } from 'express';

export const notFound: RequestHandler = (request, response) => {
  response.status(404).json({ error: 'NOT_FOUND', message: `Route ${request.method} ${request.path} was not found.` });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'INTERNAL_ERROR', message: 'The request could not be completed.' });
};
