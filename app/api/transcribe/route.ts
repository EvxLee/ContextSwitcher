// app/api/transcribe/route.ts — audio in, diarized turns out.
//   POST { source: "demo" }            -> uses the configured demo clip
//   POST multipart form, field "audio" -> uses the uploaded file
// Returns { topic, turns: RawTurn[] }.
import { NextResponse } from "next/server";
import { writeFile, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { transcribeClip } from "@/lib/deepgram";
import { segmentTurns } from "@/lib/segmentation";
import { resolveDemoClipPath, DEMO_TOPIC } from "@/lib/demoClip";

export const runtime = "nodejs"; // Deepgram SDK + fs are Node-only

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  let tempPath: string | null = null;

  try {
    let clipPath: string;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("audio");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Expected an 'audio' file field." }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = (file.name || "upload").replace(/[^a-z0-9.]/gi, "_");
      clipPath = path.join(os.tmpdir(), `debate-${Date.now()}-${safeName}`);
      await writeFile(clipPath, buffer);
      tempPath = clipPath;
    } else {
      const demo = resolveDemoClipPath();
      if (!demo) {
        return NextResponse.json(
          { error: "No demo clip found. Set DEMO_CLIP_PATH or drop an audio file in samples/." },
          { status: 400 }
        );
      }
      clipPath = demo;
    }

    const utterances = await transcribeClip(clipPath);
    const turns = segmentTurns(utterances);
    return NextResponse.json({ topic: DEMO_TOPIC, turns });
  } catch (err) {
    console.error("[/api/transcribe]", err);
    return NextResponse.json({ error: (err as Error).message || "Transcription failed." }, { status: 500 });
  } finally {
    if (tempPath) await unlink(tempPath).catch(() => {});
  }
}
