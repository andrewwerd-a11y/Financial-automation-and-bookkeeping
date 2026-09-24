import type { FastifyInstance } from 'fastify';
import { FORM_TEMPLATES, PROFILE_FIELDS, autofill, type DocumentCategory, type Vault } from '@polymathic/vault';
import { requireSelf } from '../auth.js';

const FIELD_KEYS = new Set(PROFILE_FIELDS.map((f) => f.key));
const CATEGORIES: DocumentCategory[] = ['identity', 'tax', 'insurance', 'license', 'certification', 'contract', 'invoice', 'receipt', 'permit', 'business_formation', 'other'];

/** Every vault route is owner-only; nobody else — including businesses a user works for — can read it. */
export function vaultRoutes(app: FastifyInstance, { vault }: { vault: Vault }) {
  app.get('/forms', async () => ({ fields: PROFILE_FIELDS, templates: FORM_TEMPLATES }));

  app.put<{ Params: { id: string }; Body: { fields: Record<string, string> } }>(
    '/workers/:id/vault/fields',
    { schema: { body: { type: 'object', required: ['fields'], properties: { fields: { type: 'object', additionalProperties: { type: 'string', maxLength: 500 } } } } } },
    async (req, reply) => {
      const user = requireSelf(req, reply, req.params.id);
      if (!user) return;
      const unknown = Object.keys(req.body.fields).filter((k) => !FIELD_KEYS.has(k));
      if (unknown.length) return reply.code(400).send({ error: `unknown fields: ${unknown.join(', ')}` });
      for (const [k, v] of Object.entries(req.body.fields)) vault.setField(user, k, v, { actor: user, purpose: 'profile update' });
      return { saved: Object.keys(req.body.fields) };
    },
  );

  app.post<{ Params: { id: string }; Body: { title: string; category: DocumentCategory; text: string; tags?: string[]; expiresAt?: string; mimeType?: string; contentBase64?: string } }>(
    '/workers/:id/vault/documents',
    {
      bodyLimit: 15 * 1024 * 1024,
      schema: {
        body: {
          type: 'object',
          required: ['title', 'category', 'text'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            category: { enum: CATEGORIES },
            text: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            expiresAt: { type: 'string', format: 'date' },
            mimeType: { type: 'string' },
            contentBase64: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const user = requireSelf(req, reply, req.params.id);
      if (!user) return;
      const id = vault.addDocument(user, { ...req.body, tags: req.body.tags ?? [] }, { actor: user, purpose: 'upload' });
      return reply.code(201).send({ id });
    },
  );

  app.get<{ Params: { id: string }; Querystring: { q?: string } }>('/workers/:id/vault/search', async (req, reply) => {
    const user = requireSelf(req, reply, req.params.id);
    if (!user) return;
    return { hits: vault.searchDocuments(user, req.query.q ?? '', { actor: user, purpose: 'search' }) };
  });

  app.get<{ Params: { id: string }; Querystring: { days?: string } }>('/workers/:id/vault/expiring', async (req, reply) => {
    const user = requireSelf(req, reply, req.params.id);
    if (!user) return;
    return { expiring: vault.expiringDocuments(user, Number(req.query.days ?? 60)) };
  });

  app.get<{ Params: { id: string } }>('/workers/:id/vault/audit', async (req, reply) => {
    const user = requireSelf(req, reply, req.params.id);
    if (!user) return;
    return { entries: vault.auditLog(user) };
  });

  app.get<{ Params: { id: string; templateId: string }; Querystring: { reveal?: string } }>('/workers/:id/forms/:templateId', async (req, reply) => {
    const user = requireSelf(req, reply, req.params.id);
    if (!user) return;
    if (!FORM_TEMPLATES.some((t) => t.id === req.params.templateId)) return reply.code(404).send({ error: 'unknown form' });
    return autofill(vault, user, req.params.templateId, { actor: user, revealSensitive: req.query.reveal === 'true' });
  });
}
