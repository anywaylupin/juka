import { z } from 'zod';

/**
 * Shared so the route validates exactly what the client is allowed to send.
 */
export const healthQuerySchema = z.object({
  probe: z.enum(['all', 'db', 'r2']).default('all')
});

export type HealthQuery = z.infer<typeof healthQuerySchema>;
