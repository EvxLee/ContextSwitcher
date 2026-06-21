// lib/segmentation.ts — turn Deepgram's diarized utterances into debate "turns".
// A turn is one speaker's contiguous stretch; it ends when the OTHER speaker
// takes over (CLAUDE.md: split on speaker change). Deepgram already splits on
// pauses, so we just merge consecutive same-speaker utterances back together.
import type { Speaker } from "./types";
import type { DeepgramUtterance } from "./deepgram";

export interface RawTurn {
  speaker: Speaker;
  text: string;
  start: number; // seconds into the clip
  end: number;
}

// Two-person debate: diarization speaker 0 -> A, anyone else -> B.
function toSpeaker(n: number): Speaker {
  return n === 0 ? "A" : "B";
}

export function segmentTurns(utterances: DeepgramUtterance[]): RawTurn[] {
  const turns: RawTurn[] = [];
  for (const u of utterances) {
    const speaker = toSpeaker(u.speaker);
    const last = turns[turns.length - 1];
    if (last && last.speaker === speaker) {
      last.text = `${last.text} ${u.transcript}`.trim();
      last.end = u.end;
    } else {
      turns.push({ speaker, text: u.transcript, start: u.start, end: u.end });
    }
  }
  return turns;
}
