/**
 * ChevronIcon Component
 *
 * A downward-pointing chevron used for expandable/collapsible sections.
 * Rotate via CSS transform when the section is open.
 */

interface ChevronIconProps {
  className?: string;
}

export function ChevronIcon({ className }: ChevronIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
