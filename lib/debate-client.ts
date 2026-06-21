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

const impl =
  process.env.NEXT_PUBLIC_USE_REAL_PIPELINE === "true" ? real : mock;

export const startDebate = impl.startDebate;
export const getVerdict = impl.getVerdict;
