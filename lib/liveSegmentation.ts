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
  start?: number;
  end?: number;
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
  private candidateSpeaker: Speaker | null = null;
  private candidateWords: string[] = [];

  private clearCandidate() {
    this.candidateSpeaker = null;
    this.candidateWords = [];
  }

  // Feed the final words of one is_final result. Returns any turns that completed
  // because the speaker changed partway through.
  addFinalWords(words: StreamWord[]): AssembledTurn[] {
    const completed: AssembledTurn[] = [];
    for (const w of words) {
      const text = wordText(w);
      if (!text) continue;
      const sp = toSpeaker(w.speaker);
      if (this.speaker === null) {
        this.speaker = sp;
        this.words.push(text);
        continue;
      }

      if (sp === this.speaker) {
        // A single off-speaker word surrounded by the active speaker is usually
        // a diarization wobble. Fold it back instead of creating a fake turn.
        if (this.candidateWords.length) {
          this.words.push(...this.candidateWords);
          this.clearCandidate();
        }
        this.words.push(text);
        continue;
      }

      if (this.candidateSpeaker !== sp) {
        if (this.candidateWords.length) this.words.push(...this.candidateWords);
        this.candidateSpeaker = sp;
        this.candidateWords = [];
      }
      this.candidateWords.push(text);

      // Require two consecutive words before changing speaker during continuous
      // speech. This removes the rapid A/B flicker Deepgram can produce from one
      // room microphone without delaying normal debate turns noticeably.
      if (this.candidateWords.length >= 2) {
        completed.push({ speaker: this.speaker, text: this.words.join(" ") });
        this.speaker = this.candidateSpeaker;
        this.words = [...this.candidateWords];
        this.clearCandidate();
      }
    }
    return completed;
  }

  // End the current turn (pause / UtteranceEnd / stop). Returns it if non-empty.
  flush(): AssembledTurn | null {
    return this.flushAll()[0] ?? null;
  }

  // A pause confirms even a one-word response. Return every remaining turn so a
  // short interjection is not swallowed by the previous speaker.
  flushAll(): AssembledTurn[] {
    const turns: AssembledTurn[] = [];
    if (this.speaker !== null && this.words.length > 0) {
      turns.push({ speaker: this.speaker, text: this.words.join(" ") });
    }
    if (this.candidateSpeaker !== null && this.candidateWords.length > 0) {
      turns.push({ speaker: this.candidateSpeaker, text: this.candidateWords.join(" ") });
    }
    this.words = [];
    this.speaker = null;
    this.clearCandidate();
    return turns;
  }

  // In-progress text/speaker, for live "transcript as you speak" display.
  currentText(): string {
    return [...this.words, ...this.candidateWords].join(" ");
  }
  currentSpeaker(): Speaker | null {
    return this.speaker;
  }
}
