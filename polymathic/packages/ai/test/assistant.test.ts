import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { MemoryVaultStorage, Vault, ephemeralKeyring } from '@polymathic/vault';
import { MODEL, platformTools, runAssistant, type AssistantContext, type MessagesClient } from '../src/index.js';
import { seedData } from '../../../apps/api/src/seed.js';

const { workers, opportunities } = seedData(new Date('2026-09-23T12:00:00Z'));

function context(): AssistantContext {
  const vault = new Vault(new MemoryVaultStorage(), ephemeralKeyring());
  vault.addDocument('w_alex', { title: 'Liability insurance COI', category: 'insurance', text: 'Acme Mutual general liability $1M', tags: [], expiresAt: '2026-10-01' }, { actor: 'test' });
  vault.setField('w_alex', 'ssn', '123-45-6789', { actor: 'test' });
  vault.setField('w_alex', 'legal_name', 'Alex Rivera', { actor: 'test' });
  return { worker: workers[0]!, opportunities, workers, vault };
}

const message = (content: unknown[], stop_reason: string) =>
  ({ id: 'msg', type: 'message', role: 'assistant', model: MODEL, content, stop_reason, stop_sequence: null, usage: {} }) as unknown as Anthropic.Beta.BetaMessage;

type Params = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;

/** Records a deep copy of each request, since the loop keeps appending to the same history array. */
function fakeClient(...responses: Anthropic.Beta.BetaMessage[]) {
  const requests: Params[] = [];
  const create = vi.fn(async (params: Params) => {
    requests.push(structuredClone(params));
    return responses.shift()!;
  });
  return { client: { beta: { messages: { create } } } satisfies MessagesClient, create, requests };
}

describe('assistant loop', () => {
  it('calls platform tools in parallel and answers from their results', async () => {
    const { client, requests } = fakeClient(
      message(
        [
          { type: 'tool_use', id: 't1', name: 'search_documents', input: { query: 'insurance' } },
          { type: 'tool_use', id: 't2', name: 'growth_plan', input: {} },
        ],
        'tool_use',
      ),
      message([{ type: 'text', text: 'Your COI expires Oct 1. EPA 608 unlocks $1,072.' }], 'end_turn'),
    );

    const res = await runAssistant({ client, context: context(), message: 'What should I do this month?' });

    expect(res.text).toContain('EPA 608');
    expect(res.toolCalls.map((c) => c.name)).toEqual(['search_documents', 'growth_plan']);
    const second = requests[1]!;
    const toolResults = second.messages.at(-1)!.content as Anthropic.Beta.BetaToolResultBlockParam[];
    expect(toolResults).toHaveLength(2); // both results in one user turn
    expect(String(toolResults[0]!.content)).toContain('Liability insurance COI');
  });

  it('sends a cacheable system prompt, adaptive thinking, and refusal fallbacks', async () => {
    const { client, requests } = fakeClient(message([{ type: 'text', text: 'Hi' }], 'end_turn'));
    await runAssistant({ client, context: context(), message: 'hello', mode: 'business_plan', webResearch: true });
    const params = requests[0]!;
    expect(params.model).toBe('claude-opus-5');
    expect(params.thinking).toEqual({ type: 'adaptive' });
    expect(params.fallbacks).toBe('default');
    expect(params.betas).toContain('server-side-fallback-2026-07-01');
    expect((params.system as Anthropic.Beta.BetaTextBlockParam[])[0]!.cache_control).toEqual({ type: 'ephemeral' });
    expect(params.tools!.some((t) => 'type' in t && t.type === 'web_search_20260209')).toBe(true);
    // Mode instructions ride in the user turn so the system prompt stays cacheable.
    expect(String(params.messages[0]!.content)).toMatch(/^Task: draft a practical one-page business plan/);
  });

  it('returns tool input errors to the model instead of crashing', async () => {
    const { client, requests } = fakeClient(
      message([{ type: 'tool_use', id: 't1', name: 'search_documents', input: { query: 42 } }], 'tool_use'),
      message([{ type: 'text', text: 'Sorry, retrying.' }], 'end_turn'),
    );
    const res = await runAssistant({ client, context: context(), message: 'find my insurance' });
    expect(res.toolCalls[0]!.isError).toBe(true);
    const second = requests[1]!;
    expect((second.messages.at(-1)!.content as Anthropic.Beta.BetaToolResultBlockParam[])[0]!.is_error).toBe(true);
  });

  it('stops on refusal without running tools', async () => {
    const { client } = fakeClient(message([{ type: 'tool_use', id: 't1', name: 'user_profile', input: {} }], 'refusal'));
    const res = await runAssistant({ client, context: context(), message: 'x' });
    expect(res.stopReason).toBe('refusal');
    expect(res.toolCalls).toHaveLength(0);
  });

  it('continues after pause_turn', async () => {
    const { client, create } = fakeClient(message([], 'pause_turn'), message([{ type: 'text', text: 'Done' }], 'end_turn'));
    const res = await runAssistant({ client, context: context(), message: 'research HVAC licensing', webResearch: true });
    expect(res.text).toBe('Done');
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe('platform tools', () => {
  const tools = new Map(platformTools(context()).map((t) => [t.definition.name, t]));

  it('never exposes sensitive identifiers to the model', () => {
    const out = tools.get('fill_form')!.run({ template_id: 'w9' });
    expect(out).not.toContain('123-45-6789');
    expect(out).toContain('•••6789');
  });

  it('looks up trades by name fragment', () => {
    expect(JSON.parse(tools.get('trade_requirements')!.run({ trade: 'notary' }))[0].id).toBe('notary');
  });

  it('reports market gaps and the closest entry points', () => {
    const out = JSON.parse(tools.get('market_gaps')!.run({}));
    expect(out.byTrade.length).toBeGreaterThan(5);
    expect(out.closestForUser.length).toBeGreaterThan(0);
  });
});
