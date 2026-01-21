/**
 * Footer Component
 *
 * Displays copyright information at the bottom of the application.
 * Only renders in development mode.
 */

import { isDevelopment } from '../config';
import './Footer.css';

export function Footer() {
  if (!isDevelopment) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <span className="footer-copyright">
        &copy; {currentYear} Walter Alcazar. All rights reserved.
      </span>
    </footer>
  );
}
