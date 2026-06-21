// lib/realDebateClient.ts — the REAL implementation of the debate-client contract.
// Runs in the browser and orchestrates the server pipeline via API routes:
//   /api/transcribe (once) -> /api/analyze (per turn) -> /api/tts (fouls) -> /api/verdict (end)
// The heavy lifting (Deepgram, Claude, Redis) stays server-side; this file only
// does fetch + pacing, so it is safe to bundle for the client.
import type { DebateSession, Fallacy, Speaker, Turn } from "./types";
import { decideWinner } from "./scoring";
import { postJSON } from "./fetchJson";
import { buildCalloutText } from "./callout";
import { startMicDebate } from "./realtimeDebateClient";
import { MOCK_TOPIC, mockTurns } from "./mockTurns";

const PACING_MS = 900; // brief "ref is thinking" gap between turns so the scoreboard can react
const DEFAULT_MIC_TOPIC = "Pineapple belongs on pizza.";

interface TranscribeResponse {
  topic: string;
  turns: { speaker: Speaker; text: string; start: number; end: number }[];
}

interface AnalyzeResponse {
  fallacies: Fallacy[];
  argumentStrength: number;
  pointDelta: number;
  isRebuttal: boolean;
  retrieved: string[];
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function startDebate(
  audioSource: File | "mic" | "demo",
  onTurn: (turn: Turn) => void,
  onComplete: (session: DebateSession) => void,
  onInterim?: (speaker: Speaker | null, text: string) => void,
  onError?: (message: string) => void,
  topic = DEFAULT_MIC_TOPIC
): { stop: () => void } {
  // Live mic = true real-time streaming (its own implementation).
  if (audioSource === "mic") {
    return startMicDebate(topic.trim() || DEFAULT_MIC_TOPIC, {
      onTurn,
      onComplete,
      onInterim,
      onError,
    });
  }

  let stopped = false;
  const base = Date.now();
  const session: DebateSession = {
    id: `debate-${base}`,
    topic: "",
    status: "live",
    turns: [],
    scoreA: 0,
    scoreB: 0,
  };

  (async () => {
    // 1. Transcribe + diarize + segment into raw turns.
    let data: TranscribeResponse;
    if (audioSource instanceof File) {
      const form = new FormData();
      form.append("audio", audioSource);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || "Transcription failed.");
      }
      data = (await res.json()) as TranscribeResponse;
    } else {
      try {
        data = await postJSON<TranscribeResponse>("/api/transcribe", { source: "demo" });
      } catch (error) {
        // Keep the AI judging path usable before a recorded clip is supplied.
        // These are raw scripted statements, not pre-scored mock turns. Every
        // statement still goes through /api/analyze below.
        if (!(error instanceof Error) || !error.message.includes("No demo clip found")) throw error;
        data = {
          topic: MOCK_TOPIC,
          turns: mockTurns.map((turn, index) => ({
            speaker: turn.speaker,
            text: turn.text,
            start: index * 2.6,
            end: index * 2.6 + 2.2,
          })),
        };
      }
    }
    session.topic = data.topic;

    // 2. Analyze each turn and emit it live.
    for (let i = 0; i < data.turns.length; i++) {
      if (stopped) return;
      const raw = data.turns[i];
      const analysis = await postJSON<AnalyzeResponse>("/api/analyze", {
        text: raw.text,
        previousTurnText: data.turns[i - 1]?.text,
        topic: data.topic,
      });
      if (stopped) return;

      const turn: Turn = {
        id: `t${i + 1}`,
        speaker: raw.speaker,
        text: raw.text,
        timestamp: base + Math.round(raw.start * 1000),
        fallacies: analysis.fallacies,
        argumentStrength: analysis.argumentStrength,
        pointDelta: analysis.pointDelta,
      };

      // 3. Spoken callout for high-severity fouls (graceful: text-only if TTS fails).
      const calloutText = buildCalloutText(turn);
      if (calloutText) {
        try {
          const { audioBase64 } = await postJSON<{ audioBase64: string }>("/api/tts", {
            text: calloutText,
          });
          turn.callout = { text: calloutText, audioBase64 };
        } catch {
          turn.callout = { text: calloutText };
        }
      }
      if (stopped) return;

      if (turn.speaker === "A") session.scoreA += turn.pointDelta;
      else session.scoreB += turn.pointDelta;
      session.turns.push(turn);
      onTurn(turn);

      await delay(PACING_MS);
    }

    // 4. Finish.
    if (stopped) return;
    session.status = "finished";
    session.winner = decideWinner(session.scoreA, session.scoreB);
    onComplete(session);
  })().catch((err) => {
    console.error("[startDebate] pipeline error:", err);
    onError?.((err as Error).message || "The debate pipeline stopped unexpectedly.");
  });

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      session.status = "finished";
      session.winner = decideWinner(session.scoreA, session.scoreB);
      onComplete(session);
    },
  };
}

export async function getVerdict(
  session: DebateSession
): Promise<{ winner: Speaker | "draw"; verdict: string }> {
  return postJSON<{ winner: Speaker | "draw"; verdict: string }>("/api/verdict", session);
}
