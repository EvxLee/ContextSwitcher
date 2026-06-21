// app/api/deepgram-token/route.ts — mint a short-lived Deepgram token so the
// BROWSER can open the live transcription socket without ever seeing the API key.
// Deepgram's grant() returns a ~30s JWT with usage::write for the voice APIs.
import { NextResponse } from "next/server";
import { getDeepgram } from "@/lib/deepgram";

export const runtime = "nodejs";

export async function POST() {
  try {
    const res = await getDeepgram().auth.v1.tokens.grant();
    return NextResponse.json({
      access_token: res.access_token,
      expires_in: res.expires_in ?? 30,
    });
  } catch (err) {
    console.error("[/api/deepgram-token]", err);
    return NextResponse.json(
      { error: (err as Error).message || "Token grant failed." },
      { status: 500 }
    );
  }
}
