import { useEffect, useRef, useState } from "react";
import type { DebateStatus, Speaker, Turn } from "@/lib/types";

interface ScoreboardProps {
  scoreA: number;
  scoreB: number;
  status: DebateStatus;
  lastTurn: Turn | null;
}

function AnimatedScore({
  score,
  animate,
  eventId,
}: {
  score: number;
  animate: boolean;
  eventId?: string;
}) {
  const [displayScore, setDisplayScore] = useState(score);
  const renderedScoreRef = useRef(score);

  useEffect(() => {
    const from = renderedScoreRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!animate || reducedMotion || from === score) {
      renderedScoreRef.current = score;
      setDisplayScore(score);
      return;
    }

    let animationFrame = 0;
    let startedAt: number | null = null;
    const duration = 520;

    const tick = (now: number) => {
      startedAt ??= now;
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextScore = Math.round(from + (score - from) * eased);

      renderedScoreRef.current = nextScore;
      setDisplayScore(nextScore);

      if (progress < 1) animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [animate, score]);

  return (
    <div className="score-side__number" aria-hidden="true">
      <span key={animate ? eventId : "idle"} className={animate ? "is-changing" : ""}>
        {displayScore}
      </span>
    </div>
  );
}

function ScoreSide({
  speaker,
  score,
  active,
  delta,
  eventId,
  isLeading,
}: {
  speaker: Speaker;
  score: number;
  active: boolean;
  delta?: number;
  eventId?: string;
  isLeading: boolean;
}) {
  const impactTone = delta && delta > 0 ? "gain" : delta && delta < 0 ? "loss" : "neutral";

  return (
    <section
      className={`score-side score-side--${speaker.toLowerCase()} ${active ? "score-side--active" : ""}`}
      aria-label={`Human ${speaker}, ${score} points`}
    >
      {active && eventId && (
        <span
          key={eventId}
          className={`score-side__impact score-side__impact--${impactTone}`}
          aria-hidden="true"
        />
      )}
      <div className="score-side__topline">
        <span className="speaker-dot" />
        <span>Human {speaker}</span>
        {isLeading && <span className="leading-chip">LEADING</span>}
      </div>
      <AnimatedScore score={score} animate={active} eventId={eventId} />
      <div className="score-side__footer">
        <span>COURT POINTS</span>
        {active && delta !== undefined && (
          <span
            key={eventId}
            className={`delta-chip ${
              delta > 0
                ? "delta-chip--up"
                : delta < 0
                  ? "delta-chip--down"
                  : "delta-chip--neutral"
            }`}
          >
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
    </section>
  );
}

export function Scoreboard({ scoreA, scoreB, status, lastTurn }: ScoreboardProps) {
  return (
    <aside className="scoreboard panel-frame" aria-live="polite">
      <div className="scoreboard__header">
        <div>
          <span className="section-kicker">Standing before the court</span>
          <h2>Case score</h2>
        </div>
        <div className={`status-pill status-pill--${status}`}>
          <span /> {status === "setup" ? "IN RECESS" : status === "live" ? "IN SESSION" : "ADJOURNED"}
        </div>
      </div>

      <div className="scoreboard__sides">
        <ScoreSide
          speaker="A"
          score={scoreA}
          active={lastTurn?.speaker === "A"}
          delta={lastTurn?.speaker === "A" ? lastTurn.pointDelta : undefined}
          eventId={lastTurn?.speaker === "A" ? lastTurn.id : undefined}
          isLeading={scoreA > scoreB}
        />
        <div className="score-divider">
          <span aria-hidden="true">↯</span>
        </div>
        <ScoreSide
          speaker="B"
          score={scoreB}
          active={lastTurn?.speaker === "B"}
          delta={lastTurn?.speaker === "B" ? lastTurn.pointDelta : undefined}
          eventId={lastTurn?.speaker === "B" ? lastTurn.id : undefined}
          isLeading={scoreB > scoreA}
        />
      </div>

      <div className="scoreboard__legend">
        <span><b className="legend-plus">+1 to +3</b> Supported claim</span>
        <span><b className="legend-plus">+1</b> Direct rebuttal</span>
        <span><b className="legend-minus">-1 to -3</b> Sustained objection</span>
      </div>
    </aside>
  );
}
