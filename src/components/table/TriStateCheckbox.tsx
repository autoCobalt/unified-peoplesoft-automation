/**
 * TriStateCheckbox Component
 *
 * Wraps a native <input type="checkbox"> with ref-based `indeterminate` support.
 * HTML's indeterminate is a DOM property (not an attribute), so it can only be
 * set via JavaScript — React JSX doesn't support it as a prop.
 */

import { useRef, useEffect } from 'react';

interface TriStateCheckboxProps {
  /** Whether the checkbox is fully checked */
  checked: boolean;
  /** Whether the checkbox shows the indeterminate (dash) state */
  indeterminate: boolean;
  /** Disables the checkbox (e.g., during workflow processing) */
  disabled?: boolean;
  /** Called with the new checked value on click */
  onChange: (checked: boolean) => void;
  /** Accessible label for the checkbox */
  ariaLabel: string;
  /** Optional CSS class name */
  className?: string;
}

export function TriStateCheckbox({
  checked,
  indeterminate,
  disabled = false,
  onChange,
  ariaLabel,
  className,
}: TriStateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={className}
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => { onChange(e.target.checked); }}
    />
  );
}
