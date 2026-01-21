/**
 * CircleAlertIcon Component
 *
 * Exclamation mark enclosed in a circle for warning states and alerts.
 * Stroke-based design that inherits color from parent via currentColor.
 */

interface CircleAlertIconProps {
  className?: string;
}

export function CircleAlertIcon({ className }: CircleAlertIconProps) {
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
        d="M12 8V12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="16"
        r="1"
        fill="currentColor"
      />
    </svg>
  );
}
