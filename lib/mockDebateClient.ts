// lib/mockDebateClient.ts — the MOCK implementation of the debate-client contract.
// Replays mockTurns on a timer so the UI feels live with zero backend. Evan's real
// pipeline (Batch 5) will provide the same exports from lib/realDebateClient.ts.
import type { DebateSession, Speaker, Turn } from "./types";
import { MOCK_TOPIC, mockTurns } from "./mockTurns";
import { decideWinner } from "./scoring";

const TURN_DELAY_MS = 2600; // pacing between turns, so the scoreboard has room to react

export function startDebate(
  _audioSource: File | "mic" | "demo",
  onTurn: (turn: Turn) => void,
  onComplete: (session: DebateSession) => void,
  _onInterim?: (speaker: Speaker | null, text: string) => void
): { stop: () => void } {
  let stopped = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const session: DebateSession = {
    id: `debate-${Date.now()}`,
    topic: MOCK_TOPIC,
    status: "live",
    turns: [],
    scoreA: 0,
    scoreB: 0,
  };

  mockTurns.forEach((turn, i) => {
    const timer = setTimeout(() => {
      if (stopped) return;

      session.turns.push(turn);
      if (turn.speaker === "A") session.scoreA += turn.pointDelta;
      else session.scoreB += turn.pointDelta;

      onTurn(turn);

      if (i === mockTurns.length - 1) {
        session.status = "finished";
        session.winner = decideWinner(session.scoreA, session.scoreB);
        onComplete(session);
      }
    }, (i + 1) * TURN_DELAY_MS);
    timers.push(timer);
  });

  return {
    stop: () => {
      stopped = true;
      timers.forEach(clearTimeout);
    },
  };
}

export async function getVerdict(
  session: DebateSession
): Promise<{ winner: Speaker | "draw"; verdict: string }> {
  await new Promise((r) => setTimeout(r, 600)); // simulate the ref deliberating

  const { scoreA, scoreB } = session;
  const winner = decideWinner(scoreA, scoreB);
  const verdict =
    winner === "draw"
      ? `Dead heat at ${scoreA}-${scoreB}. Both sides landed clean hits and both took fouls. The crowd decides this one.`
      : `${winner === "A" ? "Speaker A" : "Speaker B"} takes it, ${Math.max(
          scoreA,
          scoreB
        )} to ${Math.min(scoreA, scoreB)}. Cleaner argument, fewer cheap shots, and the closing point sealed it.`;

  return { winner, verdict };
}
