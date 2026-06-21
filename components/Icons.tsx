import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const defaults = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function GavelIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...defaults} {...props}>
      <path d="m14 13-7.5-7.5" />
      <path d="m8 4 3-3 5 5-3 3Z" />
      <path d="m3 9 3-3 5 5-3 3Z" />
      <path d="m13 14 6 6" />
      <path d="m17 18 2-2 4 4-2 2Z" />
      <path d="M2 22h12" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...defaults} {...props}>
      <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RotateIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...defaults} {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function VolumeIcon({ muted = false, ...props }: IconProps & { muted?: boolean }) {
  return (
    <svg aria-hidden="true" {...defaults} {...props}>
      <path d="M11 5 6 9H3v6h3l5 4Z" />
      {muted ? (
        <>
          <path d="m16 9 5 6" />
          <path d="m21 9-5 6" />
        </>
      ) : (
        <>
          <path d="M15 9.5a4 4 0 0 1 0 5" />
          <path d="M18 7a7 7 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...defaults} {...props}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v4a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4v2a4 4 0 0 0 4 4" />
      <path d="M17 6h3v2a4 4 0 0 1-4 4" />
    </svg>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...defaults} {...props}>
      <path d="M5 21V4" />
      <path d="M5 5h11l-2 3 2 3H5" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...defaults} {...props}>
      <path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z" />
      <path d="M5 3v4" />
      <path d="M3 5h4" />
    </svg>
  );
}

export function ExpandIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...defaults} {...props}>
      <path d="M8 3H3v5" />
      <path d="m3 3 6 6" />
      <path d="M16 3h5v5" />
      <path d="m21 3-6 6" />
      <path d="M8 21H3v-5" />
      <path d="m3 21 6-6" />
      <path d="M16 21h5v-5" />
      <path d="m21 21-6-6" />
    </svg>
  );
}
