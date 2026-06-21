import { useEffect, useRef } from "react";
import type { DebateStatus, Turn } from "@/lib/types";
import { FallacyFlag } from "./FallacyFlag";
import { PlayIcon, SparkIcon } from "./Icons";

interface TranscriptProps {
  turns: Turn[];
  thinking: boolean;
  status: DebateStatus;
  activeCalloutId: string | null;
  onStart: () => void;
}

function StrengthMeter({ strength }: { strength: number }) {
  return (
    <div className="strength-meter" aria-label={`Argument strength ${strength} out of 5`}>
      <span>EVIDENCE</span>
      <div className="strength-meter__bars">
        {[1, 2, 3, 4, 5].map((value) => (
          <i key={value} className={value <= strength ? "is-filled" : ""} />
        ))}
      </div>
      <b>{strength}/5</b>
    </div>
  );
}

function TurnCard({
  turn,
  index,
  isCalloutPlaying,
}: {
  turn: Turn;
  index: number;
  isCalloutPlaying: boolean;
}) {
  const deltaTone =
    turn.pointDelta > 0
      ? "positive"
      : turn.pointDelta < 0
        ? "negative"
        : "neutral";

  return (
    <article className={`turn-card turn-card--${turn.speaker.toLowerCase()}`}>
      <div className="turn-card__avatar">{turn.speaker}</div>
      <div className="turn-card__content">
        <header>
          <div>
            <span className="turn-card__speaker">COUNSEL {turn.speaker}</span>
            <span className="turn-card__number">EXHIBIT {String(index + 1).padStart(2, "0")}</span>
          </div>
          <span className={`turn-delta turn-delta--${deltaTone}`}>
            {turn.pointDelta > 0 ? "+" : ""}{turn.pointDelta} PTS
          </span>
        </header>
        <p className="turn-card__text">{turn.text}</p>

        {turn.fallacies.map((fallacy, fallacyIndex) => (
          <FallacyFlag
            key={`${fallacy.type}-${fallacyIndex}`}
            fallacy={fallacy}
            order={fallacyIndex}
          />
        ))}

        {turn.callout && (
          <div className={`ref-callout ${isCalloutPlaying ? "ref-callout--playing" : ""}`}>
            <SparkIcon className="h-5 w-5" />
            <span><b>THE COURT</b> &ldquo;{turn.callout.text}&rdquo;</span>
            <span className={`sound-wave ${isCalloutPlaying ? "is-playing" : ""}`}><i /><i /><i /><i /></span>
          </div>
        )}

        <footer>
          <StrengthMeter strength={turn.argumentStrength} />
          <span className={turn.fallacies.length ? "ruling ruling--foul" : "ruling"}>
            {turn.fallacies.length
              ? "OBJECTION SUSTAINED"
              : turn.pointDelta > 0
                ? "ENTERED INTO RECORD"
                : "INSUFFICIENT SUPPORT"}
          </span>
        </footer>
      </div>
    </article>
  );
}

function ThinkingRow() {
  return (
    <div className="thinking-row" role="status">
      <div className="thinking-row__icon"><SparkIcon className="h-5 w-5" /></div>
      <div>
        <b>THE COURT IS DELIBERATING</b>
        <span>Reviewing the argument, evidence, and possible fallacies</span>
      </div>
      <div className="thinking-dots"><i /><i /><i /></div>
    </div>
  );
}

export function Transcript({
  turns,
  thinking,
  status,
  activeCalloutId,
  onStart,
}: TranscriptProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length, thinking]);

  return (
    <section className="transcript panel-frame" aria-label="Live debate transcript">
      <div className="transcript__header">
        <div>
          <span className="section-kicker">Official record</span>
          <h2>Live transcript</h2>
        </div>
        <span className="turn-count">{turns.length} STATEMENTS</span>
      </div>

      <div className="transcript__feed" aria-live="polite">
        {status === "setup" && turns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__whistle"><SparkIcon className="h-10 w-10" /></div>
            <span className="section-kicker">The court is ready</span>
            <h3>Present your case</h3>
            <p>Begin the debate. Strong arguments earn the court&apos;s favor. Bad logic earns an objection.</p>
            <button type="button" className="primary-button" onClick={onStart}>
              <PlayIcon className="h-5 w-5" /> Call court to order
            </button>
          </div>
        ) : (
          turns.map((turn, index) => (
            <TurnCard
              key={turn.id}
              turn={turn}
              index={index}
              isCalloutPlaying={turn.id === activeCalloutId}
            />
          ))
        )}
        {thinking && <ThinkingRow />}
        <div ref={endRef} />
      </div>
    </section>
  );
}
