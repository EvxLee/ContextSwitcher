// lib/analyze.ts — the brain: turn text in, scored analysis out. THE thing that
// decides whether we win (evan.md): fallacy detection must be sharp, never
// trigger-happy. We ground Claude with the most relevant fallacies retrieved
// from Redis (Batch 2), constrain the output with a schema, and compute the
// pointDelta ourselves (Batch 1) so scoring stays consistent.
// The SDK's zod helper is built against zod v4 (shipped under this subpath in
// zod 3.25+), so we import z from there to match its expected ZodType.
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Fallacy } from "./types";
import { getAnthropic } from "./anthropic";
import { formatFallaciesForPrompt } from "./fallacies";
import { retrieveFallacies } from "./fallacyStore";
import { computePointDelta } from "./scoring";

// Project-specified in CLAUDE.md / evan.md for the latency/quality balance a
// near-real-time loop needs. (Explicit project choice, not the default.)
const ANALYSIS_MODEL = "claude-sonnet-4-6";
const RETRIEVE_K = 4;

// Thinking off keeps per-turn latency snappy and predictable for the live loop.
// If testing ever shows false flags, flip this to { type: "adaptive" } to trade
// a little latency (masked by the "ref is thinking" UI) for sharper judgment.
const THINKING = { type: "disabled" } as const;

const Analysis = z.object({
  fallacies: z
    .array(
      z.object({
        type: z
          .string()
          .describe(
            "Fallacy name. Use one of the candidate fallacies when it fits; only use another name if none fit."
          ),
        severity: z
          .union([z.literal(1), z.literal(2), z.literal(3)])
          .describe("1 minor, 2 moderate, 3 egregious."),
        quote: z
          .string()
          .describe("The exact phrase from THIS turn that triggered it."),
        explanation: z
          .string()
          .describe("One short, plain-English sentence on why it qualifies."),
      })
    )
    .describe("Fallacies ACTUALLY present. Empty array if the turn is clean."),
  argumentStrength: z
    .number()
    .int()
    .describe("0 to 5, based on reasoning and evidence, not confidence or volume."),
  isRebuttal: z
    .boolean()
    .describe("True only if this turn directly counters the opponent's previous point."),
});

const SYSTEM_PROMPT = `You are Debate Referee, a sharp, fair, and slightly theatrical judge of live spoken arguments.

You are given ONE speaker's turn, the opponent's previous turn (for rebuttal context), and a short list of candidate logical fallacies retrieved as reference.

Analyze ONLY the current turn. Rules:
- Detect logical fallacies that are ACTUALLY present. Do not invent or stretch fallacies to seem strict. A clean, fair turn MUST return an empty fallacy list. False flags ruin the game.
- Prefer a fallacy name from the candidate list when it fits; only use a different name if none of them apply.
- For each fallacy: give its type, a severity (1 minor, 2 moderate, 3 egregious), the exact quote from the turn that triggered it, and a one-line plain-English explanation.
- Rate argumentStrength from 0 to 5 on reasoning and evidence, not confidence or volume. A turn that is only an insult or a dodge is low; a well-supported point is high.
- Set isRebuttal true only if the turn directly engages and counters the opponent's previous point.
- Be fair and consistent across both speakers.`;

export interface AnalyzeInput {
  text: string;
  previousTurnText?: string;
  topic?: string;
}

export interface TurnAnalysis {
  fallacies: Fallacy[];
  argumentStrength: number; // 0..5
  pointDelta: number;
  isRebuttal: boolean;
  retrieved: string[]; // fallacy names pulled from Redis (for transparency / demo)
}

function buildUserPrompt(
  input: AnalyzeInput,
  candidates: string
): string {
  return [
    input.topic ? `Topic: ${input.topic}` : "Topic: (unspecified)",
    "",
    "Opponent's previous turn (may be empty):",
    input.previousTurnText?.trim() || "(none)",
    "",
    "Candidate fallacies (reference, may or may not apply):",
    candidates || "(none retrieved)",
    "",
    "Speaker's current turn:",
    `"${input.text.trim()}"`,
  ].join("\n");
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(n)));

export async function analyzeTurn(input: AnalyzeInput): Promise<TurnAnalysis> {
  // 1. Ground the model: vector-search Redis for the most relevant fallacies.
  const retrieved = await retrieveFallacies(input.text, RETRIEVE_K);

  // 2. Ask Claude for a schema-constrained judgment.
  const client = getAnthropic();
  const response = await client.messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 1024,
    thinking: THINKING,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildUserPrompt(input, formatFallaciesForPrompt(retrieved)) },
    ],
    output_config: { format: zodOutputFormat(Analysis) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Analysis returned no parsed output.");

  // 3. Compute the score ourselves so the scoreboard stays consistent.
  const argumentStrength = clamp(parsed.argumentStrength, 0, 5);
  const fallacies: Fallacy[] = parsed.fallacies.map((f) => ({
    type: f.type,
    severity: f.severity,
    quote: f.quote,
    explanation: f.explanation,
  }));
  const pointDelta = computePointDelta({
    argumentStrength,
    isRebuttal: parsed.isRebuttal,
    fallacies,
  });

  return {
    fallacies,
    argumentStrength,
    pointDelta,
    isRebuttal: parsed.isRebuttal,
    retrieved: retrieved.map((r) => r.name),
  };
}
