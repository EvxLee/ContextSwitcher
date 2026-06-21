// lib/callout.ts — the ref's dramatic foul line for a turn, e.g.
// "Slippery slope! Minus three, Speaker B." Null if nothing warrants a callout.
import type { Turn } from "./types";

const CALLOUT_MIN_SEVERITY = 2; // moderate fouls and worse get a spoken callout

export function buildCalloutText(turn: Turn): string | null {
  const worst = [...turn.fallacies].sort((a, b) => b.severity - a.severity)[0];
  if (!worst || worst.severity < CALLOUT_MIN_SEVERITY) return null;
  return `${worst.type}! Minus ${worst.severity}, Speaker ${turn.speaker}.`;
}
