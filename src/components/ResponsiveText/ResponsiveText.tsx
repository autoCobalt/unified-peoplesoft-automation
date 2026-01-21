import './ResponsiveText.css';

/**
 * ResponsiveText Component
 *
 * Renders two versions of text for responsive display:
 * - Full text shown on wider screens
 * - Short text shown on narrow screens
 *
 * The short version has aria-hidden="true" so screen readers
 * only announce the full text once, avoiding duplication.
 */

interface ResponsiveTextProps {
  /** Text displayed on wider screens */
  full: string;
  /** Abbreviated text for narrow screens */
  short: string;
  /** Optional CSS class applied to both spans */
  className?: string;
}

export function ResponsiveText({ full, short, className }: ResponsiveTextProps) {
  const baseClass = className ? `${className} ` : '';

  return (
    <>
      <span className={`${baseClass}responsive-text--full`}>{full}</span>
      <span className={`${baseClass}responsive-text--short`} aria-hidden="true">
        {short}
      </span>
    </>
  );
}
