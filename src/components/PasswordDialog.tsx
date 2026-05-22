import {
  memo,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

import type { EncryptionMethod } from '../providers/types';

interface PasswordDialogProps {
  currentPassword: string | null;
  currentMethod: EncryptionMethod;
  onConfirm: (password: string | null, method: EncryptionMethod) => void;
  onClose: () => void;
}

const METHOD_OPTIONS: Array<{
  description: string;
  label: string;
  value: EncryptionMethod;
}> = [
  {
    description: 'Default scanline scramble',
    label: 'Scanline',
    value: 'scanline',
  },
  {
    description: 'Legacy pixel noise',
    label: 'Noise',
    value: 'noise',
  },
];

export const PasswordDialog = memo(function PasswordDialog({
  currentMethod,
  currentPassword,
  onClose,
  onConfirm,
}: PasswordDialogProps) {
  const passwordInputId = useId();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [password, setPassword] = useState(currentPassword ?? '');
  const [method, setMethod] = useState<EncryptionMethod>(currentMethod);

  useEffect(() => {
    setPassword(currentPassword ?? '');
    setMethod(currentMethod);
  }, [currentMethod, currentPassword]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submitPassword = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmedPassword = password.trim();
    onConfirm(trimmedPassword.length > 0 ? trimmedPassword : null, method);
  };

  const clearPassword = () => {
    onConfirm(null, method);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="LodaManager"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        aria-labelledby={titleId}
        aria-modal="true"
        className="Loda-window UI Loda Loda_Password"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={submitPassword}
        role="dialog"
        tabIndex={-1}
      >
        <button className="ico-btn close" onClick={onClose} type="button" />
        <header id={titleId}>Decryption Password</header>

        <div className="password-dialog-content">
          <label className="password-field" htmlFor={passwordInputId}>
            <span>Password</span>
            <input
              autoComplete="current-password"
              id={passwordInputId}
              onChange={(event) => setPassword(event.target.value)}
              ref={inputRef}
              type="password"
              value={password}
            />
          </label>

          <fieldset className="password-methods">
            <legend>Encryption method</legend>
            <div className="password-method-grid">
              {METHOD_OPTIONS.map((option) => (
                <label
                  className="password-method-card"
                  data-selected={method === option.value}
                  key={option.value}
                >
                  <input
                    checked={method === option.value}
                    name="encryption-method"
                    onChange={() => setMethod(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span className="password-method-illustration" />
                  <span className="password-method-title">{option.label}</span>
                  <span className="password-method-description">
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <footer className="password-actions">
            <button
              className="ResetButton password-clear"
              onClick={clearPassword}
              type="button"
            >
              Clear
            </button>
            <span />
            <button className="ResetButton" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="ResetButton password-confirm" type="submit">
              Confirm
            </button>
          </footer>
        </div>
      </form>
    </div>
  );
});
