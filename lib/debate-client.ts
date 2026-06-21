// lib/debate-client.ts — THE SHARED CONTRACT surface. Chester's UI imports ONLY
// from this file and never needs to know how a Turn was produced.
//
//   startDebate(source, onTurn, onComplete) -> { stop }
//   getVerdict(session) -> { winner, verdict }
//
// MOCK replays mockTurns with zero backend; REAL (lib/realDebateClient.ts) runs
// the live pipeline (Deepgram -> turns -> Claude analysis -> TTS -> verdict) via
// API routes. Same signatures, so the UI is identical either way.
//
// Default is MOCK so the UI works with no keys. Set
// NEXT_PUBLIC_USE_REAL_PIPELINE=true (and provide a demo clip + keys) to go live.
import * as mock from "./mockDebateClient";
import * as real from "./realDebateClient";

// Mic mode is always real. Demo mode follows the explicit public flag so local
// development can exercise the recorded Deepgram -> Claude pipeline while the
// flag-off path remains a stage-safe mock.
export const startDebate: typeof real.startDebate = (
  source,
  onTurn,
  onComplete,
  onInterim,
  onError,
  topic
) => {
  const useRealPipeline = process.env.NEXT_PUBLIC_USE_REAL_PIPELINE === "true";
  const impl = source === "mic" || useRealPipeline ? real : mock;
  return impl.startDebate(source, onTurn, onComplete, onInterim, onError, topic);
};

// Use the real Claude verdict when the API is reachable; fall back to the mock
// verdict so the offline demo never breaks.
export const getVerdict: typeof real.getVerdict = async (session) => {
  try {
    return await real.getVerdict(session);
  } catch {
    return mock.getVerdict(session);
  }
};
