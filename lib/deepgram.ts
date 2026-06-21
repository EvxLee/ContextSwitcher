// lib/deepgram.ts — Deepgram speech-to-text + speaker diarization.
//
// We use PRERECORDED transcription (not live streaming) on purpose: the demo
// runs on a recorded clip (CLAUDE.md demo-safety rule), prerecorded diarization
// is more accurate, and the "live feel" is recreated by replaying turns on a
// timer in startDebate (Batch 5). Live-mic streaming is a later bonus.
//
// `utterances: true` + `diarize: true` makes Deepgram return speech segments
// already split by pause AND tagged with a speaker number — most of turn
// segmentation is done for us (we just merge same-speaker runs in segmentation.ts).
import { createReadStream } from "node:fs";
import { DeepgramClient } from "@deepgram/sdk";

let client: DeepgramClient | null = null;

export function getDeepgram(): DeepgramClient {
  if (!client) client = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });
  return client;
}

export const DEEPGRAM_MODEL = "nova-3"; // current best; swap to "nova-2" if unavailable

export interface DeepgramUtterance {
  speaker: number; // 0, 1, ... assigned by diarization
  transcript: string;
  start: number; // seconds into the clip
  end: number;
}

// Transcribe a local audio file into diarized utterances.
export async function transcribeClip(filePath: string): Promise<DeepgramUtterance[]> {
  const dg = getDeepgram();
  const response = await dg.listen.v1.media.transcribeFile(createReadStream(filePath), {
    model: DEEPGRAM_MODEL,
    diarize: true, // who said what
    utterances: true, // pre-split speech segments
    smart_format: true, // punctuation, casing, numerals
    punctuate: true,
  });

  if (!("results" in response) || !response.results.utterances) {
    throw new Error(
      "Deepgram returned no utterances. Confirm the audio decoded and diarize+utterances are enabled."
    );
  }

  return response.results.utterances
    .filter((u) => (u.transcript ?? "").trim().length > 0)
    .map((u) => ({
      speaker: u.speaker ?? 0,
      transcript: (u.transcript ?? "").trim(),
      start: u.start ?? 0,
      end: u.end ?? 0,
    }));
}
