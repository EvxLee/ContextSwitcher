// lib/demoClip.ts — locate the demo audio clip and the debate topic (server-side).
// Set DEMO_CLIP_PATH in .env, or just drop an audio file in samples/.
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const AUDIO_RE = /\.(wav|mp3|m4a|flac|ogg|opus|webm|mp4|aac)$/i;

export function resolveDemoClipPath(): string | null {
  const fromEnv = process.env.DEMO_CLIP_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const dir = path.join(process.cwd(), "samples");
  if (!existsSync(dir)) return null;
  const file = readdirSync(dir).find((f) => AUDIO_RE.test(f));
  return file ? path.join(dir, file) : null;
}

// The debate topic for the demo clip. Auto-deriving from the transcript is a
// future nicety; for the controlled demo a fixed topic is simplest.
export const DEMO_TOPIC = process.env.DEMO_TOPIC || "Pineapple belongs on pizza.";
