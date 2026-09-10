import { Router } from 'express';
import { env } from '../../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', async (_request, response) => {
  let agentService = { status: 'unavailable' };

  try {
    const result = await fetch(`${env.agentServiceUrl}/health`, { signal: AbortSignal.timeout(1500) });
    if (result.ok) agentService = { status: 'online' };
  } catch {
    // Health remains degraded while local agent service is stopped.
  }

  response.status(200).json({
    status: agentService.status === 'online' ? 'healthy' : 'degraded',
    service: 'nerve-api',
    version: '0.1.0',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    agentService,
  });
});
