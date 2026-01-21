/**
 * TotalDisplay Component
 *
 * Displays the total transaction count in the SmartForm header.
 * Simple presentational component with optional className for layout control.
 */

import './TotalDisplay.css';

interface TotalDisplayProps {
  /** Total count to display */
  count: number;
  /** Optional className for layout positioning */
  className?: string;
}

export function TotalDisplay({ count, className = '' }: TotalDisplayProps) {
  return (
    <div className={`sf-total ${className}`}>
      <span className="sf-total-label">Total:</span>
      <span className="sf-total-value">{count}</span>
    </div>
  );
}
