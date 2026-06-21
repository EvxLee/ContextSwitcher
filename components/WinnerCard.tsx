import type { DebateSession, Speaker } from "@/lib/types";
import { RotateIcon, SparkIcon } from "./Icons";

interface WinnerCardProps {
  session: DebateSession;
  loading: boolean;
  onReplay: () => void;
}

function winnerLabel(winner?: Speaker | "draw") {
  if (winner === "draw") return "Plot twist: it is a draw";
  return winner ? `Human ${winner} takes it` : "The drama continues";
}

export function WinnerCard({ session, loading, onReplay }: WinnerCardProps) {
  const winner = session.winner;

  return (
    <section className={`winner-card winner-card--${winner ?? "pending"}`} aria-live="polite">
      <div className="winner-card__confetti" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i /><i />
      </div>
      <div className="winner-card__trophy"><SparkIcon className="h-10 w-10" /></div>
      <span className="section-kicker">The AI has spoken</span>
      <h2>{winnerLabel(winner)}</h2>
      <div className="winner-card__score">
        <span>A <b>{session.scoreA}</b></span>
        <em>THAT&apos;S IT</em>
        <span>B <b>{session.scoreB}</b></span>
      </div>
      {loading ? (
        <div className="verdict-loading"><i /><i /><i /> Writing the final roast</div>
      ) : (
        <p>{session.verdict}</p>
      )}
      <button type="button" className="secondary-button" onClick={onReplay}>
        <RotateIcon className="h-4 w-4" /> Run it back
      </button>
    </section>
  );
}
