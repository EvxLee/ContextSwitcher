"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVerdict, startDebate } from "@/lib/debate-client";
import type { DebateSession, DebateStatus, Turn } from "@/lib/types";
import { ExpandIcon, PlayIcon, RotateIcon, SparkIcon, VolumeIcon } from "./Icons";
import { Scoreboard } from "./Scoreboard";
import { Transcript } from "./Transcript";
import { useRefAudio } from "./useRefAudio";
import { WinnerCard } from "./WinnerCard";

type DebateController = { stop: () => void };

interface DebateArenaProps {
  initialTopic: string;
}

export function DebateArena({ initialTopic }: DebateArenaProps) {
  const [status, setStatus] = useState<DebateStatus>("setup");
  const [topic, setTopic] = useState(initialTopic);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [lastTurn, setLastTurn] = useState<Turn | null>(null);
  const [thinking, setThinking] = useState(false);
  const [session, setSession] = useState<DebateSession | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controllerRef = useRef<DebateController | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);
  const {
    activeCalloutId,
    isSpeaking,
    muted,
    playCallout,
    speakVerdict,
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

  const runDebate = useCallback(() => {
    const runId = ++runIdRef.current;
    controllerRef.current?.stop();
    if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    unlockAudio();
    stopAudio();

    setStatus("live");
    setTopic(initialTopic);
    setTurns([]);
    setScoreA(0);
    setScoreB(0);
    setLastTurn(null);
    setSession(null);
    setVerdictLoading(false);
    setThinking(true);
    setError(null);

    try {
      controllerRef.current = startDebate(
        "demo",
        (turn) => {
          if (runId !== runIdRef.current) return;
          if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
          setThinking(false);
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
            speakVerdict(result.verdict);
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
        }
      );
    } catch {
      if (runId !== runIdRef.current) return;
      setStatus("setup");
      setThinking(false);
      setError("The debate refused to launch. Check the audio and give it another dramatic click.");
    }
  }, [initialTopic, playCallout, speakVerdict, stopAudio, unlockAudio]);

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
          <span>LOGIC GLITCH</span>
        </div>
      ) : null}
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <nav className="topbar">
        <div className="brand">
          <span className="brand__mark"><SparkIcon className="h-6 w-6" /></span>
          <div><b>COLLINA</b><span>DEBATE CHAOS ENGINE</span></div>
        </div>

        <div className="topbar__actions">
          <span className="demo-chip"><i /> PLAYGROUND MODE</span>
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
            <button type="button" className="nav-button" onClick={runDebate}>
              <PlayIcon className="h-4 w-4" /> Start the chaos
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
              <b>AI REF TRIPPED</b>
              <span>{error}</span>
            </div>
            <button type="button" onClick={runDebate}>TRY AGAIN</button>
          </div>
        )}

        <header className="topic-banner panel-frame">
          <div className="topic-banner__label">
            <span>TODAY&apos;S EXTREMELY IMPORTANT QUESTION</span>
            <i />
          </div>
          <h1>&ldquo;{topic}&rdquo;</h1>
          <div className="topic-banner__meta">
            <span>2 HUMANS</span><i /><span>1 AI REF</span><i /><span>ZERO CHILL</span>
          </div>
          <div className={`topic-banner__progress topic-banner__progress--${status}`}>
            <span />
          </div>
        </header>

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
                <span className="section-kicker">AI ref status</span>
                <b>{isSpeaking ? "Calling it out loud" : thinking ? "Cooking up a ruling" : status === "finished" ? "The last word is ready" : "Listening for nonsense"}</b>
              </div>
              <span className="ref-booth__audio">SOUND {muted ? "MUTED" : isSpeaking ? "LIVE" : "READY"}</span>
            </section>

            {session && <WinnerCard session={session} loading={verdictLoading} onReplay={runDebate} />}
          </div>
        </div>

        <footer className="app-footer">
          <span>BUILT FOR BIG OPINIONS AND QUESTIONABLE LOGIC</span>
          <div><i /> Deepgram hears it <i /> Claude calls it <i /> Redis remembers it</div>
        </footer>
      </div>
    </main>
  );
}
