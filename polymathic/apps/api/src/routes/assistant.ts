import type { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import type { Opportunity } from '@polymathic/core';
import type { Vault } from '@polymathic/vault';
import { runAssistant, type AssistantMode, type MessagesClient } from '@polymathic/ai';
import { requireSelf } from '../auth.js';
import type { MemoryStore } from '../store.js';

export interface AssistantDeps {
  store: MemoryStore;
  vault: Vault;
  market: () => Promise<Opportunity[]>;
  /** Unset when no Anthropic credentials are configured. */
  client?: MessagesClient;
}

export function assistantRoutes(app: FastifyInstance, { store, vault, market, client }: AssistantDeps) {
  app.post<{ Params: { id: string }; Body: { message: string; mode?: AssistantMode; webResearch?: boolean } }>(
    '/workers/:id/assistant',
    {
      schema: {
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', minLength: 1, maxLength: 8000 },
            mode: { enum: ['general', 'business_plan', 'growth_research', 'paperwork'] },
            webResearch: { type: 'boolean' },
          },
        },
      },
    },
    async (req, reply) => {
      const user = requireSelf(req, reply, req.params.id);
      if (!user) return;
      if (!client) return reply.code(503).send({ error: 'Assistant not configured: set ANTHROPIC_API_KEY' });
      const worker = store.workers.get(user);
      if (!worker) return reply.code(404).send({ error: 'worker not found' });

      try {
        const result = await runAssistant({
          client,
          context: { worker, opportunities: await market(), workers: [...store.workers.values()], vault },
          history: store.conversations.get(user),
          message: req.body.message,
          mode: req.body.mode,
          webResearch: req.body.webResearch ?? req.body.mode === 'growth_research',
        });
        store.conversations.set(user, result.history);
        return { reply: result.text, stopReason: result.stopReason, toolsUsed: result.toolCalls.map((c) => c.name) };
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) return reply.code(429).send({ error: 'Assistant is busy, try again shortly' });
        if (err instanceof Anthropic.APIError) return reply.code(502).send({ error: 'Assistant request failed' });
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string } }>('/workers/:id/assistant', async (req, reply) => {
    const user = requireSelf(req, reply, req.params.id);
    if (!user) return;
    store.conversations.delete(user);
    return reply.code(204).send();
  });
}
