// lib/realtimeDebateClient.ts — TRUE real-time mic mode (browser only).
//
//   mic -> /api/deepgram-token -> open Deepgram v1 live socket (diarized) ->
//   stream audio -> assemble turns live -> /api/analyze per turn -> onTurn,
//   with interim transcript via onInterim ("transcript as you speak").
//
// ⚠️ UNTESTED in this environment (needs a real browser + mic). The pure
// turn-assembly core (lib/liveSegmentation.ts) IS unit-tested; this wiring needs
// validation in the browser during integration with Chester's UI.
import type { DebateSession, Fallacy, Speaker, Turn } from "./types";
import { decideWinner } from "./scoring";
import { LiveTurnAssembler, type StreamWord } from "./liveSegmentation";
import { buildCalloutText } from "./callout";
import { postJSON } from "./fetchJson";

const DEEPGRAM_WS = "wss://api.deepgram.com/v1/listen";

interface AnalyzeResponse {
  fallacies: Fallacy[];
  argumentStrength: number;
  pointDelta: number;
  isRebuttal: boolean;
  retrieved: string[];
}

// Minimal shape of the Deepgram streaming messages we read.
interface StreamMessage {
  type?: string;
  is_final?: boolean;
  channel?: { alternatives?: { transcript?: string; words?: StreamWord[] }[] };
}

export interface MicHandlers {
  onTurn: (turn: Turn) => void;
  onComplete: (session: DebateSession) => void;
  onInterim?: (speaker: Speaker | null, text: string) => void;
  onError?: (message: string) => void;
}

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

export function startMicDebate(topic: string, handlers: MicHandlers): { stop: () => void } {
  let ended = false;
  let mediaStream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let socket: WebSocket | null = null;

  const assembler = new LiveTurnAssembler();
  const session: DebateSession = {
    id: `debate-${Date.now()}`,
    topic,
    status: "live",
    turns: [],
    scoreA: 0,
    scoreB: 0,
  };
  let turnIndex = 0;
  let prevTurnText: string | undefined;

  // Serialize analysis so onTurn fires in spoken order even if calls overlap.
  let chain: Promise<void> = Promise.resolve();
  const enqueueTurn = (speaker: Speaker, text: string) => {
    chain = chain
      .then(() => processTurn(speaker, text))
      .catch((e) => {
        console.error("[mic] turn error:", e);
        handlers.onError?.((e as Error).message || "The AI judge could not score that turn.");
      });
  };

  async function processTurn(speaker: Speaker, text: string) {
    const clean = text.trim();
    if (!clean) return;
    const idx = ++turnIndex;
    const analysis = await postJSON<AnalyzeResponse>("/api/analyze", {
      text: clean,
      previousTurnText: prevTurnText,
      topic,
    });
    const turn: Turn = {
      id: `t${idx}`,
      speaker,
      text: clean,
      timestamp: Date.now(),
      fallacies: analysis.fallacies,
      argumentStrength: analysis.argumentStrength,
      pointDelta: analysis.pointDelta,
    };
    const calloutText = buildCalloutText(turn);
    if (calloutText) {
      try {
        const { audioBase64 } = await postJSON<{ audioBase64: string }>("/api/tts", { text: calloutText });
        turn.callout = { text: calloutText, audioBase64 };
      } catch {
        turn.callout = { text: calloutText }; // text-only if TTS fails
      }
    }
    if (turn.speaker === "A") session.scoreA += turn.pointDelta;
    else session.scoreB += turn.pointDelta;
    session.turns.push(turn);
    prevTurnText = clean;
    handlers.onTurn(turn);
  }

  (async () => {
    const { key } = await postJSON<{ key: string }>("/api/deepgram-token", {});
    if (ended) return;

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (ended) {
      mediaStream.getTracks().forEach((t) => t.stop());
      return;
    }

    const params = new URLSearchParams({
      model: "nova-3",
      diarize: "true",
      interim_results: "true",
      smart_format: "true",
      punctuate: "true",
      utterance_end_ms: "1000",
      endpointing: "300",
      vad_events: "true",
    });
    // Deepgram browser auth: API key via websocket subprotocol (only method that
    // works in a browser — headers and JWT temp-tokens don't).
    socket = new WebSocket(`${DEEPGRAM_WS}?${params.toString()}`, ["token", key]);

    socket.onopen = () => {
      const mimeType = pickMimeType();
      recorder = new MediaRecorder(mediaStream!, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && socket && socket.readyState === WebSocket.OPEN) socket.send(e.data);
      };
      recorder.start(250); // emit 250ms audio chunks
    };

    socket.onmessage = (ev) => {
      if (ended) return;
      let msg: StreamMessage;
      try {
        msg = JSON.parse(typeof ev.data === "string" ? ev.data : "") as StreamMessage;
      } catch {
        return;
      }
      if (msg.type === "Results") {
        const alt = msg.channel?.alternatives?.[0];
        if (!msg.is_final) {
          const latestSpeaker = alt?.words?.at(-1)?.speaker;
          if (alt?.transcript) handlers.onInterim?.(latestSpeaker === undefined ? null : latestSpeaker === 0 ? "A" : "B", alt.transcript);
          return;
        }
        for (const t of assembler.addFinalWords(alt?.words ?? [])) enqueueTurn(t.speaker, t.text);
        handlers.onInterim?.(assembler.currentSpeaker(), assembler.currentText());
      } else if (msg.type === "UtteranceEnd") {
        for (const t of assembler.flushAll()) enqueueTurn(t.speaker, t.text);
      }
    };

    socket.onerror = (e) => {
      console.error("[mic] socket error:", e);
      handlers.onError?.("Deepgram lost the live audio connection.");
    };
  })().catch((err) => {
    console.error("[startMicDebate] setup error:", err);
    handlers.onError?.((err as Error).message || "The microphone could not start.");
  });

  function stop() {
    if (ended) return;
    ended = true;
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      /* ignore */
    }
    mediaStream?.getTracks().forEach((t) => t.stop());

    // Process the final in-progress turn, then wrap up after analysis settles.
    const remaining = assembler.flushAll();
    for (const last of remaining) {
      chain = chain
        .then(() => processTurn(last.speaker, last.text))
        .catch((e) => {
          console.error("[mic] final turn error:", e);
          handlers.onError?.((e as Error).message || "The AI judge could not score the final turn.");
        });
    }
    chain.then(() => {
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
      session.status = "finished";
      session.winner = decideWinner(session.scoreA, session.scoreB);
      handlers.onComplete(session);
    });
  }

  return { stop };
}
