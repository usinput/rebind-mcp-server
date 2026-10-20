// Minimal OpenRouter tool-calling step. LEAF module: node fs/fetch only, ZERO
// imports from the MCP SDK / image pipeline / session — the bench re-exports
// llmStep from here and must never transitively pull those in (see the covenant
// in ./prompts.ts). Both the bench loop and the server's delegate_task /
// rebind_versus tools call it.
//
// Deliberately NOT @rebind/llm: that transport force-adds a web_search tool and
// drops usage. Here we want a clean, controlled step — tools in, the raw
// assistant message + parsed tool calls + exact usage out. Temperature 0.

const URL =
  process.env.OPENROUTER_URL || "https://openrouter.ai/api/v1/chat/completions";
// hard ceiling on one model round-trip. fetch has no built-in timeout, so a
// wedged connection would hang forever; abort so the caller fails and moves on.
const LLM_TIMEOUT_MS = Number(process.env.BENCH_LLM_TIMEOUT || 60000);
const MAX_RETRIES = Number(process.env.OPENROUTER_MAX_RETRIES || 3);

// key resolution: env var first, then the repo root's decrypted .env.production
// so `just bench-demo` (and a bare server) work from a fresh shell without
// exporting anything. Resolved LAZILY — importing this module must have no fs
// side effect (the production server imports it just to register two tools).
let KEY: string | undefined;
function key(): string {
  if (KEY !== undefined) return KEY;
  KEY = process.env.OPENROUTER_API_KEY || keyFromRootEnv();
  return KEY;
}
function keyFromRootEnv(): string {
  try {
    const txt = require("node:fs").readFileSync(
      new globalThis.URL("../../../.env.production", import.meta.url),
      "utf8",
    ) as string;
    return /^OPENROUTER_API_KEY=(.*)$/m.exec(txt)?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

export interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// OpenAI/OpenRouter message shape. `content` is a string or multimodal parts.
export type Msg = Record<string, unknown>;

export interface ParsedCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface Step {
  /** raw assistant message, pushed back verbatim so tool_call_ids line up */
  message: Msg;
  toolCalls: ParsedCall[];
  /** OpenRouter-reported usage for THIS request; cost is exact USD credits. */
  usage?: { prompt: number; completion: number; cost: number };
}

const safeParse = (s: string): Record<string, unknown> => {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function llmStep(
  messages: Msg[],
  tools: Tool[],
  model: string,
): Promise<Step> {
  if (!key()) throw new Error("set OPENROUTER_API_KEY (Bun auto-loads .env)");

  // usage.include makes OpenRouter return exact token counts + USD cost per
  // request — no client-side pricing table to drift. Omit `tools` entirely when
  // empty: strict providers 400 on an empty tools array.
  const body = JSON.stringify({
    model,
    messages,
    ...(tools.length ? { tools } : {}),
    max_tokens: 4096,
    temperature: 0,
    usage: { include: true },
  });

  let res: Response;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://rebind.gg",
          "X-Title": "Rebind Agent Bench",
        },
        body,
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      });
    } catch (e) {
      if (e instanceof Error && e.name === "TimeoutError") {
        throw new Error(
          `openrouter request timed out after ${LLM_TIMEOUT_MS}ms`,
        );
      }
      throw e;
    }
    if (res.ok) break;
    // 429 (rate limit) and 5xx are transient — parallel fan-out reliably trips
    // 429 on the flash tiers. Back off and retry; surface anything else at once.
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      await sleep(400 * 2 ** attempt);
      continue;
    }
    throw new Error(`openrouter ${res.status}: ${await res.text()}`);
  }

  const j = (await res.json()) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: {
          id: string;
          function: { name: string; arguments: string };
        }[];
      };
    }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      cost?: number;
    };
  };
  const m = j.choices?.[0]?.message ?? { content: null };
  const toolCalls: ParsedCall[] = (m.tool_calls ?? []).map((t) => ({
    id: t.id,
    name: t.function.name,
    args: safeParse(t.function.arguments),
  }));
  const usage = j.usage
    ? {
        prompt: j.usage.prompt_tokens ?? 0,
        completion: j.usage.completion_tokens ?? 0,
        cost: j.usage.cost ?? 0,
      }
    : undefined;
  return { message: m as Msg, toolCalls, usage };
}
