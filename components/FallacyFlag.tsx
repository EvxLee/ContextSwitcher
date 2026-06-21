import type { CSSProperties } from "react";
import type { Fallacy } from "@/lib/types";
import { FlagIcon } from "./Icons";

const severityCopy = {
  1: "Tiny logic wobble",
  2: "Fallacy spotted",
  3: "Certified logic fail",
} as const;

export function FallacyFlag({ fallacy, order = 0 }: { fallacy: Fallacy; order?: number }) {
  const style = { "--flag-delay": `${180 + order * 110}ms` } as CSSProperties;

  return (
    <div
      className={`foul-flag foul-flag--severity-${fallacy.severity}`}
      role="note"
      aria-label={`${fallacy.type} spotted, minus ${fallacy.severity}`}
      style={style}
    >
      <div className="foul-flag__rail" />
      <div className="foul-flag__body">
        <div className="foul-flag__header">
          <span className="foul-flag__eyebrow">
            <FlagIcon className="h-4 w-4" /> {severityCopy[fallacy.severity]}
          </span>
          <span className="foul-flag__penalty">
            <span className="severity-pips" aria-hidden="true">
              {[1, 2, 3].map((level) => (
                <i key={level} className={level <= fallacy.severity ? "is-filled" : ""} />
              ))}
            </span>
            -{fallacy.severity} PTS
          </span>
        </div>
        <div className="foul-flag__name">{fallacy.type}</div>
        <p className="foul-flag__why">{fallacy.explanation}</p>
        <blockquote>&ldquo;{fallacy.quote}&rdquo;</blockquote>
      </div>
    </div>
  );
}
