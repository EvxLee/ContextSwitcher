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
  _onInterim?: (speaker: Speaker | null, text: string) => void,
  _onError?: (message: string) => void,
  _topic?: string
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
      if (stopped) return;
      stopped = true;
      timers.forEach(clearTimeout);
      session.status = "finished";
      session.winner = decideWinner(session.scoreA, session.scoreB);
      onComplete(session);
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
      ? `Plot twist: ${scoreA}-${scoreB}. Both humans made real points and both got caught doing weird things with logic. The internet may now argue about the result forever.`
      : `${winner === "A" ? "Speaker A" : "Speaker B"} takes it, ${Math.max(
          scoreA,
          scoreB
        )} to ${Math.min(scoreA, scoreB)}. Better reasoning, fewer logic glitches, and one closing point that actually did its homework.`;

  return { winner, verdict };
}
