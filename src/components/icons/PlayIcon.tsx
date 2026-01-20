/**
 * PlayIcon Component
 *
 * Play/run triangle icon representing start/execute action.
 * Used in query buttons before initial query has been run.
 */

interface PlayIconProps {
  className?: string;
}

export function PlayIcon({ className }: PlayIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 3L19 12L5 21V3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
