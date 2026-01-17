/**
 * Footer Component
 *
 * Displays copyright information at the bottom of the application.
 * Only renders in development mode.
 */

import './Footer.css';

// Application mode from environment variables (matches ModeBanner logic)
const appMode = (import.meta.env.VITE_APP_MODE as string | undefined) ?? 'development';
const isDevelopment = appMode === 'development';

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
