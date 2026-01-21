/**
 * CircleCheckIcon Component
 *
 * Checkmark enclosed in a circle for success states and confirmations.
 * Stroke-based design that inherits color from parent via currentColor.
 */

interface CircleCheckIconProps {
  className?: string;
}

export function CircleCheckIcon({ className }: CircleCheckIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 12L11 15L16 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
