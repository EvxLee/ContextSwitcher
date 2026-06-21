// app/api/analyze/route.ts — POST a turn's text, get back scored analysis.
// This is the seam Chester swaps onto at T+6h: the UI can call this per turn.
import { NextResponse } from "next/server";
import { analyzeTurn } from "@/lib/analyze";

// node-redis + Transformers.js need the Node runtime (not edge).
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, previousTurnText, topic } = (body ?? {}) as {
    text?: unknown;
    previousTurnText?: unknown;
    topic?: unknown;
  };

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "Body must include a non-empty 'text' string." },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeTurn({
      text,
      previousTurnText: typeof previousTurnText === "string" ? previousTurnText : undefined,
      topic: typeof topic === "string" ? topic : undefined,
    });
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: (err as Error).message || "Analysis failed." },
      { status: 500 }
    );
  }
}
