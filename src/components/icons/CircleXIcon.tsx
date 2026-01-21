/**
 * CircleXIcon Component
 *
 * X mark enclosed in a circle for error states and failures.
 * Stroke-based design that inherits color from parent via currentColor.
 */

interface CircleXIconProps {
  className?: string;
}

export function CircleXIcon({ className }: CircleXIconProps) {
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
        d="M15 9L9 15M9 9L15 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
