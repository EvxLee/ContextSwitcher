// lib/liveSegmentation.ts — assemble a LIVE diarized word stream into debate turns.
// This is the riskiest part of real-time mode, so it's a pure, unit-tested class
// (see scripts/test-segmentation.ts) with no browser/network dependencies.
//
// We only feed FINAL words (is_final results) here; interim words are for display
// only. A turn ends when the speaker changes, or when flush() is called (a pause /
// UtteranceEnd / stop).
import type { Speaker } from "./types";

export interface AssembledTurn {
  speaker: Speaker;
  text: string;
}

// Subset of a Deepgram streaming word we use.
export interface StreamWord {
  word: string;
  punctuated_word?: string;
  speaker?: number;
}

function toSpeaker(n: number | undefined): Speaker {
  return (n ?? 0) === 0 ? "A" : "B";
}

function wordText(w: StreamWord): string {
  return (w.punctuated_word || w.word || "").trim();
}

export class LiveTurnAssembler {
  private speaker: Speaker | null = null;
  private words: string[] = [];

  // Feed the final words of one is_final result. Returns any turns that completed
  // because the speaker changed partway through.
  addFinalWords(words: StreamWord[]): AssembledTurn[] {
    const completed: AssembledTurn[] = [];
    for (const w of words) {
      const text = wordText(w);
      if (!text) continue;
      const sp = toSpeaker(w.speaker);
      if (this.speaker !== null && sp !== this.speaker && this.words.length > 0) {
        completed.push({ speaker: this.speaker, text: this.words.join(" ") });
        this.words = [];
      }
      this.speaker = sp;
      this.words.push(text);
    }
    return completed;
  }

  // End the current turn (pause / UtteranceEnd / stop). Returns it if non-empty.
  flush(): AssembledTurn | null {
    if (this.speaker === null || this.words.length === 0) return null;
    const turn: AssembledTurn = { speaker: this.speaker, text: this.words.join(" ") };
    this.words = [];
    this.speaker = null;
    return turn;
  }

  // In-progress text/speaker, for live "transcript as you speak" display.
  currentText(): string {
    return this.words.join(" ");
  }
  currentSpeaker(): Speaker | null {
    return this.speaker;
  }
}
