/**
 * InfoRow Component
 *
 * Simple label/value display row for connection info panels.
 * Used in both connected and disconnected states.
 */

interface InfoRowProps {
  /** Label text displayed on the left */
  label: string;
  /** Value displayed on the right */
  value: React.ReactNode;
  /** Applies highlight styling to the row */
  highlight?: boolean;
  /** Additional CSS class for the value element */
  valueClassName?: string;
}

export function InfoRow({ label, value, highlight, valueClassName }: InfoRowProps) {
  const rowClassName = highlight ? 'info-row highlight' : 'info-row';
  const valueClass = valueClassName ? `info-value ${valueClassName}` : 'info-value';

  return (
    <div className={rowClassName}>
      <span className="info-label">{label}:</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
