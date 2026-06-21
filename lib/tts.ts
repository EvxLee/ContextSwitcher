// lib/tts.ts — Deepgram text-to-speech for the ref's voice callouts.
// Returns base64 MP3 so the frontend can play it directly (data: URI or Blob).
import { getDeepgram } from "./deepgram";

const TTS_MODEL = "aura-orion-en"; // confident announcer voice for the ref

export async function synthesizeSpeech(text: string): Promise<string> {
  const dg = getDeepgram();
  const audio = await dg.speak.v1.audio.generate({
    text,
    model: TTS_MODEL,
    encoding: "mp3",
  });
  const buffer = Buffer.from(await audio.arrayBuffer());
  return buffer.toString("base64");
}
