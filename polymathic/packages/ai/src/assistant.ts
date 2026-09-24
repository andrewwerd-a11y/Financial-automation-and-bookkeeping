import Anthropic from '@anthropic-ai/sdk';
import { ToolInputError, platformTools, type AssistantContext } from './tools.js';

export const MODEL = 'claude-opus-5';
const MAX_TURNS = 12;

type Params = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
type MessageParam = Anthropic.Beta.BetaMessageParam;

/** The slice of the SDK client the assistant uses; lets tests inject a fake. */
export interface MessagesClient {
  beta: { messages: { create(params: Params): PromiseLike<Anthropic.Beta.BetaMessage> } };
}

export type AssistantMode = 'general' | 'business_plan' | 'growth_research' | 'paperwork';

// Stable across every request so the prompt cache holds; per-request context
// goes in the user turn instead.
const SYSTEM_PROMPT = `You are the Polymathic assistant. Polymathic is an end-to-end platform for self-employed people, crews, and small businesses: it finds work across every source, handles paperwork, payments, records, and growth planning so people can focus on the hands-on work.

You help one signed-in user at a time. Ground every answer in their real data by calling the tools: their profile, their encrypted document vault, their local market, and the trade taxonomy. Prefer concrete numbers, named documents, and next actions over general advice.

Licensing, permitting, and tax rules vary by state, county, and city. When the answer depends on local rules and web search is available, look them up and cite the sources; otherwise say what to verify and where. You give information, not legal or tax advice; for high-stakes decisions, recommend a licensed professional and say what to bring them.

Sensitive identifiers (SSN, EIN, date of birth, license numbers) are masked in tool results. Never ask the user to paste them into chat; point them to their vault instead.`;

const MODE_INSTRUCTIONS: Record<AssistantMode, string> = {
  general: '',
  business_plan:
    "Task: draft a practical one-page business plan for the user's goal. Cover services and pricing (from local market data), target customers, equipment and startup costs, the licensing/insurance/paperwork checklist (check the vault for what they already have), a low-cost marketing plan, and 30/60/90-day milestones.",
  growth_research:
    'Task: research exactly what it takes for the user to enter the named trade or field where they live: schooling or programs, licensing and exams, typical costs, timeline, and local demand. Combine market_gaps and trade_requirements with current web sources, and end with a step-by-step path starting from what they already have.',
  paperwork:
    'Task: help the user get their paperwork done. Find the relevant documents in the vault, prefill any standard forms, flag anything expired or expiring, and list exactly what is still missing.',
};

export interface AssistantOptions {
  client: MessagesClient;
  context: AssistantContext;
  /** Prior turns, as returned from a previous call. */
  history?: MessageParam[];
  message: string;
  mode?: AssistantMode;
  /** Adds Anthropic's server-side web search for live requirements research. */
  webResearch?: boolean;
}

export interface AssistantResult {
  text: string;
  stopReason: string | null;
  history: MessageParam[];
  toolCalls: { name: string; input: unknown; isError: boolean }[];
}

export async function runAssistant(opts: AssistantOptions): Promise<AssistantResult> {
  const tools = platformTools(opts.context);
  const byName = new Map(tools.map((t) => [t.definition.name, t]));
  const toolDefs: Anthropic.Beta.BetaToolUnion[] = tools.map((t) => t.definition);
  if (opts.webResearch) toolDefs.push({ type: 'web_search_20260209', name: 'web_search', max_uses: 5 });

  const instructions = MODE_INSTRUCTIONS[opts.mode ?? 'general'];
  const history: MessageParam[] = [
    ...(opts.history ?? []),
    { role: 'user', content: instructions ? `${instructions}\n\n${opts.message}` : opts.message },
  ];
  const toolCalls: AssistantResult['toolCalls'] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await opts.client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: toolDefs,
      messages: history,
      // If the model declines, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    history.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'refusal') {
      return { text: "I can't help with that request.", stopReason: 'refusal', history, toolCalls };
    }
    if (response.stop_reason === 'pause_turn') continue;

    const uses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
    if (response.stop_reason !== 'tool_use' || uses.length === 0) {
      return { text: textOf(response), stopReason: response.stop_reason, history, toolCalls };
    }

    // All results go back in one user message so parallel tool use keeps working.
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = uses.map((use) => {
      const tool = byName.get(use.name);
      let content: string;
      let isError = false;
      try {
        if (!tool) throw new ToolInputError(`Unknown tool ${use.name}`);
        if (typeof use.input !== 'object' || use.input === null) throw new ToolInputError('Input must be an object');
        content = tool.run(use.input as Record<string, unknown>);
      } catch (err) {
        // Bad model input is recoverable: report it and let the model correct itself.
        if (!(err instanceof ToolInputError)) throw err;
        content = err.message;
        isError = true;
      }
      toolCalls.push({ name: use.name, input: use.input, isError });
      return { type: 'tool_result', tool_use_id: use.id, content, is_error: isError };
    });
    history.push({ role: 'user', content: results });
  }

  return { text: 'I ran out of steps before finishing. Try a narrower question.', stopReason: 'max_turns', history, toolCalls };
}

function textOf(message: Anthropic.Beta.BetaMessage): string {
  return message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}
