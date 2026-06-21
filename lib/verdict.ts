// lib/verdict.ts — the closing verdict (CLAUDE.md section 10 final-verdict prompt).
// Winner is computed deterministically from the scoreboard; Claude writes the
// punchy verdict text consistent with that winner so the two never disagree.
import type { DebateSession, Speaker } from "./types";
import { getAnthropic } from "./anthropic";
import { decideWinner } from "./scoring";

const VERDICT_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are Debate Referee delivering a closing verdict to a live audience. You are confident, fun, and a little savage. This is read out loud, so keep it punchy.`;

export async function generateVerdict(
  session: DebateSession
): Promise<{ winner: Speaker | "draw"; verdict: string }> {
  const winner = decideWinner(session.scoreA, session.scoreB);
  const winnerLabel = winner === "draw" ? "a draw" : `Speaker ${winner}`;

  const turns = session.turns.map((t) => ({
    speaker: t.speaker,
    text: t.text,
    fallacies: t.fallacies.map((f) => `${f.type} (severity ${f.severity})`),
    argumentStrength: t.argumentStrength,
    pointDelta: t.pointDelta,
  }));

  const prompt = [
    `Topic: ${session.topic}`,
    `Final score: A ${session.scoreA}, B ${session.scoreB}. The winner is ${winnerLabel}.`,
    `Turns (JSON): ${JSON.stringify(turns)}`,
    "",
    "Write the verdict. Rules:",
    "- 3 to 4 sentences, max.",
    `- State the winner (${winnerLabel}) and the single clearest reason.`,
    "- Call out the most memorable foul or the strongest point by name.",
    "- Punchy and a little theatrical. No preamble, just the verdict.",
  ].join("\n");

  const client = getAnthropic();
  const response = await client.messages.create({
    model: VERDICT_MODEL,
    max_tokens: 400,
    thinking: { type: "disabled" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const verdict =
    response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim() || "The ref is speechless. We'll call this one a draw.";

  return { winner, verdict };
}
