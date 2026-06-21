// app/api/verdict/route.ts — POST a finished DebateSession, get { winner, verdict }.
import { NextResponse } from "next/server";
import { generateVerdict } from "@/lib/verdict";
import type { DebateSession } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let session: DebateSession;
  try {
    session = (await req.json()) as DebateSession;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!session || !Array.isArray(session.turns)) {
    return NextResponse.json({ error: "Body must be a DebateSession with a 'turns' array." }, { status: 400 });
  }

  try {
    return NextResponse.json(await generateVerdict(session));
  } catch (err) {
    console.error("[/api/verdict]", err);
    return NextResponse.json({ error: (err as Error).message || "Verdict failed." }, { status: 500 });
  }
}
