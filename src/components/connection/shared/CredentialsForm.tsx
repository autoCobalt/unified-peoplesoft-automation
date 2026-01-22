/**
 * CredentialsForm Component
 *
 * Reusable username/password form with submit button and error display.
 * Manages its own form state internally for simplicity.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { InteractiveElement, SlideIn } from '../../motion';

interface CredentialsFormProps {
  /** Prefix for input IDs to ensure uniqueness (e.g., 'oracle', 'soap') */
  idPrefix: string;
  /** Placeholder text for inputs */
  placeholders: {
    username: string;
    password: string;
  };
  /** Text shown on submit button when idle */
  submitLabel: string;
  /** Text shown on submit button while submitting */
  loadingLabel: string;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Error message to display, if any */
  error: string | null;
  /** Callback when form is submitted with credentials */
  onSubmit: (credentials: { username: string; password: string }) => void;
}

export function CredentialsForm({
  idPrefix,
  placeholders,
  submitLabel,
  loadingLabel,
  isSubmitting,
  error,
  onSubmit,
}: CredentialsFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ username, password });
  };

  const isDisabled = isSubmitting || !username || !password;

  return (
    <form onSubmit={handleSubmit} className="connection-form">
      <div className="form-group">
        <label htmlFor={`${idPrefix}-username-input`}>Username</label>
        <input
          id={`${idPrefix}-username-input`}
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); }}
          placeholder={placeholders.username}
          autoComplete="username"
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${idPrefix}-password-input`}>Password</label>
        <input
          id={`${idPrefix}-password-input`}
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); }}
          placeholder={placeholders.password}
          autoComplete="current-password"
        />
      </div>

      <InteractiveElement
        as="button"
        type="submit"
        className="submit-button"
        disabled={isDisabled}
      >
        {isSubmitting ? (
          <>
            <span className="spinner" />
            {loadingLabel}
          </>
        ) : (
          submitLabel
        )}
      </InteractiveElement>

      <AnimatePresence>
        {error && (
          <SlideIn
            direction="down"
            offset={10}
            duration={0.2}
            withExit
            className="error-message"
          >
            {error}
          </SlideIn>
        )}
      </AnimatePresence>
    </form>
  );
}
