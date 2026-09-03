/**
 * Claude, through the Anthropic SDK, behind the Engine function
 * (RFC-0010 §0) — the production engine. Structured output holds the
 * model to `OutputSchema`; the frozen system prompt is cached across
 * asks; a refusal is an empty answer, never a made-up one.
 *
 * Credentials come from the environment (ANTHROPIC_API_KEY, or a profile
 * from `ant auth login`); nothing here holds a key.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { OutputSchema, type Engine } from "../engine.ts";

export type AnthropicOptions = {
  model?: string | undefined;
  client?: Anthropic;
  effort?: "low" | "medium" | "high";
};

export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5";

export function anthropicEngine(opts: AnthropicOptions = {}): Engine {
  const model = opts.model ?? ANTHROPIC_DEFAULT_MODEL;
  const client = opts.client ?? new Anthropic();
  return {
    name: `anthropic:${model}`,
    async complete({ system, user }) {
      const response = await client.messages.parse({
        model,
        max_tokens: 16000,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
        output_config: {
          format: zodOutputFormat(OutputSchema),
          ...(opts.effort !== undefined ? { effort: opts.effort } : {}),
        },
      });
      if (response.stop_reason === "refusal") return { outputs: [] };
      return response.parsed_output ?? { outputs: [] };
    },
  };
}
