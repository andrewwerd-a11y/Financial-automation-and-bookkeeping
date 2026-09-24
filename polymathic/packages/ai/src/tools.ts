import type Anthropic from '@anthropic-ai/sdk';
import {
  TRADES,
  classifyRequest,
  computeTrust,
  estimatePrice,
  getService,
  entryOptions,
  equipmentReport,
  getTrade,
  growthPlan,
  marketSnapshot,
  type Opportunity,
  type PriceObservation,
  type WorkerProfile,
} from '@polymathic/core';
import { FORM_TEMPLATES, autofill, type Vault } from '@polymathic/vault';

export interface AssistantContext {
  worker: WorkerProfile;
  /** Current market: aggregated opportunities around the user. */
  opportunities: Opportunity[];
  /** Worker pool used for supply-side gap analysis. */
  workers: WorkerProfile[];
  vault: Vault;
  /** Real local prices from the platform, for price checks. */
  priceObservations?: PriceObservation[];
}

export interface PlatformTool {
  definition: Anthropic.Beta.BetaTool;
  run(input: Record<string, unknown>): string;
}

export class ToolInputError extends Error {}

function str(input: Record<string, unknown>, key: string, required = true): string | undefined {
  const v = input[key];
  if (v === undefined && !required) return undefined;
  if (typeof v !== 'string' || !v.trim()) throw new ToolInputError(`"${key}" must be a non-empty string`);
  return v;
}

function num(input: Record<string, unknown>, key: string, fallback: number): number {
  const v = input[key];
  if (v === undefined) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ToolInputError(`"${key}" must be a number`);
  return v;
}

const json = (x: unknown) => JSON.stringify(x);

/**
 * Tools that ground the assistant in the user's own data. Each one only ever
 * sees the signed-in user's vault, and sensitive fields stay masked.
 */
export function platformTools(ctx: AssistantContext): PlatformTool[] {
  const { worker, opportunities, workers, vault, priceObservations } = ctx;
  const access = (purpose: string) => ({ actor: 'assistant', purpose });

  return [
    {
      definition: {
        name: 'search_documents',
        description:
          "Search the user's encrypted document vault (licenses, insurance, certifications, tax forms, contracts, receipts, permits) by keywords. Returns titles, categories, expiry dates and matching snippets.",
        input_schema: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Keywords, e.g. "liability insurance" or "EPA 608".' } },
          required: ['query'],
        },
      },
      run: (input) => json(vault.searchDocuments(worker.id, str(input, 'query')!, access('assistant search'))),
    },
    {
      definition: {
        name: 'read_document',
        description: "Read the full extracted text of one document from the user's vault, by id from search_documents.",
        input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      run: (input) => {
        const doc = vault.getDocument(worker.id, str(input, 'id')!, access('assistant read'));
        if (!doc) throw new ToolInputError('No document with that id');
        const { contentBase64: _omit, ...rest } = doc;
        return json(rest);
      },
    },
    {
      definition: {
        name: 'expiring_documents',
        description: 'List vault documents (licenses, insurance, certifications, permits) that expire within the given number of days.',
        input_schema: { type: 'object', properties: { within_days: { type: 'number' } } },
      },
      run: (input) => json(vault.expiringDocuments(worker.id, num(input, 'within_days', 60))),
    },
    {
      definition: {
        name: 'fill_form',
        description: `Prefill a standard form from the user's saved profile. Sensitive values come back masked. Returns filled fields and which required fields are missing. Templates: ${FORM_TEMPLATES.map((t) => `${t.id} (${t.name})`).join('; ')}.`,
        input_schema: {
          type: 'object',
          properties: { template_id: { type: 'string', enum: FORM_TEMPLATES.map((t) => t.id) } },
          required: ['template_id'],
        },
      },
      run: (input) => json(autofill(vault, worker.id, str(input, 'template_id')!, { actor: 'assistant' })),
    },
    {
      definition: {
        name: 'trade_requirements',
        description:
          'Look up a trade in the Polymathic taxonomy: skill tier, typical licensing, certifications, equipment, per-job logistics, and entry pathways. Pass a trade id or a name fragment like "hvac" or "notary". Typical US picture only; confirm local rules with web search.',
        input_schema: { type: 'object', properties: { trade: { type: 'string' } }, required: ['trade'] },
      },
      run: (input) => {
        const q = str(input, 'trade')!.toLowerCase();
        const exact = getTrade(q);
        const matches = exact ? [exact] : TRADES.filter((t) => t.id.includes(q) || t.name.toLowerCase().includes(q)).slice(0, 5);
        if (!matches.length) throw new ToolInputError(`No trade matches "${q}"`);
        return json(matches);
      },
    },
    {
      definition: {
        name: 'market_gaps',
        description:
          "Demand vs. qualified supply around the user, by trade and by skill tier (low/medium/high), plus the under-supplied trades closest to the user's current skills with the exact steps missing.",
        input_schema: { type: 'object', properties: {} },
      },
      run: () => {
        const snapshot = marketSnapshot(opportunities, workers);
        return json({ byTier: snapshot.byTier, byTrade: snapshot.byTrade, closestForUser: entryOptions(worker, opportunities, snapshot).slice(0, 5) });
      },
    },
    {
      definition: {
        name: 'growth_plan',
        description:
          "The user's trust score breakdown and the certifications, equipment, and skills that would unlock the most paid work right now, with dollar values.",
        input_schema: { type: 'object', properties: {} },
      },
      run: () => json({ trust: computeTrust(worker), plan: growthPlan(worker, opportunities) }),
    },
    {
      definition: {
        name: 'equipment_report',
        description:
          'What the user can already sell with the equipment they own (trades and service ideas), and which equipment purchases would unlock the most work relative to cost.',
        input_schema: { type: 'object', properties: {} },
      },
      run: () => {
        const r = equipmentReport(worker, opportunities);
        return json({ ...r, equippedFor: r.equippedFor.map((x) => ({ trade: x.trade.name, missingCertifications: x.missingCertifications })), investments: r.investments.slice(0, 8) });
      },
    },
    {
      definition: {
        name: 'price_check',
        description:
          "Local price range for a service from the Polymathic pricing database (regional seed data blended with real jobs paid nearby). Pass a service id or a plain description like \"pressure wash a driveway\", and optionally a quantity in the service's unit. Near the user's home by default.",
        input_schema: {
          type: 'object',
          properties: { service: { type: 'string' }, quantity: { type: 'number' } },
          required: ['service'],
        },
      },
      run: (input) => {
        const q = str(input, 'service')!;
        const serviceId = getService(q) ? q : classifyRequest(q)[0]?.serviceId;
        if (!serviceId) throw new ToolInputError(`No priced service matches "${q}"`);
        return json(estimatePrice(serviceId, { location: worker.home, quantity: num(input, 'quantity', 1), observations: priceObservations }));
      },
    },
    {
      definition: {
        name: 'user_profile',
        description: "The user's work profile: skills, certifications, equipment, availability, and track record. No sensitive identifiers.",
        input_schema: { type: 'object', properties: {} },
      },
      run: () => {
        const { id: _id, ...profile } = worker;
        return json(profile);
      },
    },
  ];
}
