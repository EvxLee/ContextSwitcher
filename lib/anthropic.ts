// lib/anthropic.ts — shared Anthropic client. Reads ANTHROPIC_API_KEY from the
// environment (.env), so we never hardcode the key.
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}
