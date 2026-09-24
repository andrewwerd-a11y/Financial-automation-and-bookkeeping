import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * DEVELOPMENT-ONLY identity: the caller names themselves in `x-user-id`.
 * This exists so ownership checks are already enforced on every sensitive
 * route; it must be replaced with real sign-in (passkeys / OAuth sessions)
 * before any deployment.
 */
export function currentUser(req: FastifyRequest): string | undefined {
  const id = req.headers['x-user-id'];
  return typeof id === 'string' && id ? id : undefined;
}

/** Returns the user id, or sends 401/403 and returns undefined. */
export function requireSelf(req: FastifyRequest, reply: FastifyReply, ownerId: string): string | undefined {
  const user = currentUser(req);
  if (!user) {
    void reply.code(401).send({ error: 'sign in required' });
    return undefined;
  }
  if (user !== ownerId) {
    void reply.code(403).send({ error: 'you can only access your own records' });
    return undefined;
  }
  return user;
}

export function requireUser(req: FastifyRequest, reply: FastifyReply): string | undefined {
  const user = currentUser(req);
  if (!user) void reply.code(401).send({ error: 'sign in required' });
  return user;
}
