/**
 * Ollama — a model on this machine, free, behind the Engine function
 * (RFC-0010 §0). The native chat API with a JSON-schema `format` holds
 * the model to the output shape; temperature is zero so the same
 * situation reads the same way twice.
 */

import { z } from "zod";
import { OutputSchema, parseJsonObject, type Engine } from "../engine.ts";

export type OllamaOptions = {
  model?: string | undefined;
  host?: string | undefined;
  /** Context window to ask for; the situation must fit in it. */
  numCtx?: number;
  fetchImpl?: typeof fetch;
};

export const OLLAMA_DEFAULT_MODEL = "llama3.2:3b";
export const OLLAMA_DEFAULT_HOST = "http://127.0.0.1:11434";

export function ollamaEngine(opts: OllamaOptions = {}): Engine {
  const model = opts.model ?? OLLAMA_DEFAULT_MODEL;
  const host = (opts.host ?? OLLAMA_DEFAULT_HOST).replace(/\/$/, "");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const format = z.toJSONSchema(OutputSchema);
  return {
    name: `ollama:${model}`,
    async complete({ system, user }) {
      const res = await fetchImpl(`${host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          format,
          options: { temperature: 0, num_ctx: opts.numCtx ?? 8192 },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
      const doc = (await res.json()) as { message?: { content?: string } };
      return parseJsonObject(doc.message?.content ?? "");
    },
  };
}

/** Is a server up, and does it hold the model? */
export async function ollamaAvailable(opts: OllamaOptions = {}): Promise<boolean> {
  const host = (opts.host ?? OLLAMA_DEFAULT_HOST).replace(/\/$/, "");
  const model = opts.model ?? OLLAMA_DEFAULT_MODEL;
  try {
    const res = await (opts.fetchImpl ?? fetch)(`${host}/api/tags`);
    if (!res.ok) return false;
    const doc = (await res.json()) as { models?: { name: string }[] };
    return (doc.models ?? []).some((m) => m.name === model || m.name === `${model}:latest`);
  } catch {
    return false;
  }
}
