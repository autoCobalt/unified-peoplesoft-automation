/**
 * PlaceholderSection Component
 *
 * Reusable "Coming Soon" placeholder for panels that haven't been implemented yet.
 * Each panel's Sections folder can import this until real content is built.
 */

import './PlaceholderSection.css';

interface PlaceholderSectionProps {
  /** Icon emoji to display */
  icon: string;
  /** Title/heading for the section */
  title: string;
  /** Description of what this section will do */
  description: string;
}

export function PlaceholderSection({ icon, title, description }: PlaceholderSectionProps) {
  return (
    <div className="panel-placeholder">
      <div className="placeholder-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="placeholder-badge">Coming Soon</span>
    </div>
  );
}
