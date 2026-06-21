// app/api/tts/route.ts — POST { text }, get { audioBase64 } (MP3) for a ref callout.
import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/tts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let text: unknown;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Body must include a non-empty 'text' string." }, { status: 400 });
  }

  try {
    const audioBase64 = await synthesizeSpeech(text);
    return NextResponse.json({ audioBase64 });
  } catch (err) {
    console.error("[/api/tts]", err);
    return NextResponse.json({ error: (err as Error).message || "TTS failed." }, { status: 500 });
  }
}
