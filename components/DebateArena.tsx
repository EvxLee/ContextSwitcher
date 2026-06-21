"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVerdict, startDebate } from "@/lib/debate-client";
import type { DebateSession, DebateStatus, Speaker, Turn } from "@/lib/types";
import { ExpandIcon, PlayIcon, RotateIcon, SparkIcon, VolumeIcon } from "./Icons";

// Mic + Stop glyphs for the live controls (kept local to avoid touching Icons.tsx).
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
import { Scoreboard } from "./Scoreboard";
import { Transcript } from "./Transcript";
import { useRefAudio } from "./useRefAudio";
import { WinnerCard } from "./WinnerCard";

type DebateController = { stop: () => void };

interface DebateArenaProps {
  initialTopic: string;
}

const LIVE_TOPIC_PRESETS = [
  "AI should be allowed to vote.",
  "College should be free.",
  "Social media does more harm than good.",
];

export function DebateArena({ initialTopic }: DebateArenaProps) {
  const [status, setStatus] = useState<DebateStatus>("setup");
  const [topic, setTopic] = useState(initialTopic);
  const [topicDraft, setTopicDraft] = useState(initialTopic);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [lastTurn, setLastTurn] = useState<Turn | null>(null);
  const [thinking, setThinking] = useState(false);
  const [session, setSession] = useState<DebateSession | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode, setMode] = useState<"demo" | "mic">("demo");
  const [interim, setInterim] = useState<{ speaker: Speaker | null; text: string } | null>(null);
  const [liveStartedAt, setLiveStartedAt] = useState<number | null>(null);
  const controllerRef = useRef<DebateController | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);
  const {
    activeCalloutId,
    isSpeaking,
    muted,
    playCallout,
    stopAudio,
    toggleMuted,
    unlockAudio,
  } = useRefAudio();
  const foulSeverity = lastTurn?.fallacies.reduce(
    (highest, fallacy) => Math.max(highest, fallacy.severity),
    0
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shellRef.current) await shellRef.current.requestFullscreen();
    } catch {
      setError("Fullscreen got stage fright. The rest of the demo still works.");
    }
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      controllerRef.current?.stop();
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    };
  }, []);

  const launch = useCallback((source: "demo" | "mic") => {
    const selectedTopic = topicDraft.trim() || initialTopic;
    const runId = ++runIdRef.current;
    controllerRef.current?.stop();
    if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    unlockAudio();
    stopAudio();

    setMode(source);
    setStatus("live");
    setTopic(source === "mic" ? selectedTopic : initialTopic);
    setLiveStartedAt(source === "mic" ? Date.now() : null);
    setTurns([]);
    setScoreA(0);
    setScoreB(0);
    setLastTurn(null);
    setSession(null);
    setVerdictLoading(false);
    setEnding(false);
    setInterim(null);
    setThinking(true);
    setError(null);

    try {
      controllerRef.current = startDebate(
        source,
        (turn) => {
          if (runId !== runIdRef.current) return;
          if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
          setThinking(false);
          setInterim(null);
          setTurns((current) => [...current, turn]);
          setLastTurn(turn);
          if (turn.speaker === "A") setScoreA((score) => score + turn.pointDelta);
          else setScoreB((score) => score + turn.pointDelta);
          void playCallout(turn);

          thinkingTimerRef.current = setTimeout(() => setThinking(true), 950);
        },
        async (completedSession) => {
          if (runId !== runIdRef.current) return;
          if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
          setThinking(false);
          setEnding(false);
          setStatus("finished");
          setTopic(completedSession.topic || initialTopic);
          setTurns(completedSession.turns);
          setLastTurn(completedSession.turns.at(-1) ?? null);
          setScoreA(completedSession.scoreA);
          setScoreB(completedSession.scoreB);
          setSession(completedSession);
          setVerdictLoading(true);

          try {
            const result = await getVerdict(completedSession);
            if (runId !== runIdRef.current) return;
            const ruledSession = { ...completedSession, ...result };
            setSession(ruledSession);
          } catch {
            if (runId !== runIdRef.current) return;
            setSession({
              ...completedSession,
              verdict:
                "The scores are locked. The AI ref lost its final punchline somewhere in the void.",
            });
            setError("The score survived, but the AI ref dropped the final roast.");
          } finally {
            if (runId === runIdRef.current) setVerdictLoading(false);
          }
        },
        (speaker, text) => {
          if (runId !== runIdRef.current) return;
          setInterim(text ? { speaker, text } : null);
        },
        (message) => {
          if (runId !== runIdRef.current) return;
          setThinking(false);
          setEnding(false);
          setError(message);
        },
        selectedTopic
      );
    } catch {
      if (runId !== runIdRef.current) return;
      setStatus("setup");
      setThinking(false);
      setError("The debate refused to launch. Check the audio and give it another dramatic click.");
    }
  }, [initialTopic, playCallout, stopAudio, topicDraft, unlockAudio]);

  const runDebate = useCallback(() => launch("demo"), [launch]);
  const goLive = useCallback(() => launch("mic"), [launch]);
  const stopDebate = useCallback(() => {
    if (!controllerRef.current || status !== "live" || ending) return;
    setEnding(true);
    setThinking(true);
    setInterim(null);
    controllerRef.current.stop();
  }, [ending, status]);

  useEffect(() => {
    const handleDemoShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) {
        return;
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        void toggleFullscreen();
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMuted();
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        runDebate();
      }
    };

    window.addEventListener("keydown", handleDemoShortcut);
    return () => window.removeEventListener("keydown", handleDemoShortcut);
  }, [runDebate, toggleFullscreen, toggleMuted]);

  return (
    <main ref={shellRef} className="app-shell">
      {lastTurn && foulSeverity ? (
        <div
          key={lastTurn.id}
          className={`foul-impact foul-impact--severity-${foulSeverity}`}
          aria-hidden="true"
        >
          <span>OBJECTION SUSTAINED</span>
        </div>
      ) : null}
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <nav className="topbar">
        <div className="brand">
          <span className="brand__mark">DR</span>
          <div><b>DEBATE REFEREE</b><span>COURT OF PUBLIC OPINION</span></div>
        </div>

        <div className="topbar__actions">
          <span className={`demo-chip ${mode === "mic" && status === "live" ? "demo-chip--live" : ""}`}>
            <i /> {mode === "mic" && status === "live" ? "LIVE AI PIPELINE" : "COURT IN SESSION"}
          </span>
          <button
            type="button"
            className={`icon-button ${isFullscreen ? "is-active" : ""}`}
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? "Exit presentation mode" : "Enter presentation mode"}
            title={`${isFullscreen ? "Exit" : "Enter"} presentation mode (F)`}
          >
            <ExpandIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={toggleMuted}
            aria-label={muted ? "Turn AI ref sound on" : "Mute AI ref sound"}
            title={muted ? "Turn AI ref sound on" : "Mute AI ref sound"}
          >
            <VolumeIcon className="h-5 w-5" muted={muted} />
          </button>
          {status === "setup" ? (
            <>
              <button type="button" className="nav-button" onClick={runDebate}>
                <PlayIcon className="h-4 w-4" /> Call to order
              </button>
              <button type="button" className="nav-button nav-button--quiet" onClick={goLive}>
                <MicIcon className="h-4 w-4" /> Go live (mic)
              </button>
            </>
          ) : status === "live" ? (
            <button type="button" className="nav-button" onClick={stopDebate} disabled={ending}>
              <StopIcon className="h-4 w-4" /> {ending ? "Closing arguments" : "End debate"}
            </button>
          ) : (
            <button type="button" className="nav-button nav-button--quiet" onClick={runDebate}>
              <RotateIcon className="h-4 w-4" /> Run it back
            </button>
          )}
        </div>
      </nav>

      <div className="arena">
        {error && (
          <div className="arena-alert" role="alert">
            <div>
              <b>COURT REPORTER ERROR</b>
              <span>{error}</span>
            </div>
            <button type="button" onClick={runDebate}>TRY AGAIN</button>
          </div>
        )}

        <header className="topic-banner panel-frame">
          <div className="topic-banner__label">
            <span>CASE BEFORE THE COURT</span>
            <i />
          </div>
          {status === "setup" ? (
            <div className="topic-editor">
              <label htmlFor="debate-topic">Choose the case</label>
              <input
                id="debate-topic"
                value={topicDraft}
                maxLength={100}
                onChange={(event) => setTopicDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    goLive();
                  }
                }}
                aria-describedby="topic-help"
              />
              <div className="topic-presets" id="topic-help">
                {LIVE_TOPIC_PRESETS.map((preset) => (
                  <button key={preset} type="button" onClick={() => setTopicDraft(preset)}>
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <h1>&ldquo;{topic}&rdquo;</h1>
          )}
          <div className="topic-banner__meta">
            <span>COUNSEL A</span><i /><span>COUNSEL B</span><i /><span>AI PRESIDING</span>
          </div>
          <div className={`topic-banner__progress topic-banner__progress--${status}`}>
            <span />
          </div>
        </header>

        {mode === "mic" && status === "live" ? (
          <div className="live-proof panel-frame">
            <div className="live-proof__pipeline" aria-label="Live AI processing pipeline">
              <b><i /> LIVE</b>
              <span>Deepgram hearing</span><em>→</em>
              <span>Redis recalling</span><em>→</em>
              <span>Claude judging</span>
            </div>
            <div className="live-proof__speech">
              <span className="section-kicker">
                {interim ? `SPEAKER ${interim.speaker ?? "?"}` : "READY FOR COUNSEL A"}
              </span>
              <p>
                {interim?.text || "Take clear turns and pause briefly between speakers—the court is listening."}
              </p>
              {liveStartedAt ? <time>SESSION {new Date(liveStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time> : null}
            </div>
          </div>
        ) : null}

        <div className="arena-grid">
          <Transcript
            turns={turns}
            thinking={thinking}
            status={status}
            activeCalloutId={activeCalloutId}
            onStart={runDebate}
          />

          <div className="arena-sidebar">
            <Scoreboard scoreA={scoreA} scoreB={scoreB} status={status} lastTurn={lastTurn} />

            <section className={`ref-booth panel-frame ${isSpeaking ? "is-speaking" : ""}`}>
              <div className={`ref-booth__light ${thinking || isSpeaking ? "is-thinking" : ""}`}>
                <SparkIcon className="h-6 w-6" />
              </div>
              <div>
              <span className="section-kicker">Presiding judge</span>
                <b>{isSpeaking ? "Calling a foul" : ending ? "Reviewing the record" : thinking ? "Weighing the argument" : status === "finished" ? "Judgment entered" : "Court is listening"}</b>
              </div>
              <span className="ref-booth__audio">CALLOUTS {muted ? "MUTED" : isSpeaking ? "LIVE" : "READY"}</span>
            </section>

            {session && <WinnerCard session={session} loading={verdictLoading} onReplay={runDebate} />}
          </div>
        </div>

        <footer className="app-footer">
          <span>ALL ARGUMENTS ENTERED INTO THE RECORD</span>
          <div><i /> Deepgram records <i /> Claude rules <i /> Redis recalls</div>
        </footer>
      </div>
    </main>
  );
}
