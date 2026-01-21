/**
 * CheckIcon Component
 *
 * Simple checkmark icon for completed states, confirmations, and selections.
 * Stroke-based design that inherits color from parent via currentColor.
 */

interface CheckIconProps {
  className?: string;
}

export function CheckIcon({ className }: CheckIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
