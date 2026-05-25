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

const ScanlineIllustration = () => {
  return (
    <svg
      className="illustration-scanline"
      viewBox="0 0 160 80"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="scanlineBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0d0e12" />
          <stop offset="100%" stopColor="#15171f" />
        </linearGradient>
        <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff0055" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00ffff" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Background card */}
      <rect width="100%" height="100%" fill="url(#scanlineBgGrad)" />

      {/* Grid pattern background */}
      <g stroke="rgba(255, 255, 255, 0.03)" strokeWidth="0.5">
        <line x1="20" y1="0" x2="20" y2="80" />
        <line x1="40" y1="0" x2="40" y2="80" />
        <line x1="60" y1="0" x2="60" y2="80" />
        <line x1="80" y1="0" x2="80" y2="80" />
        <line x1="100" y1="0" x2="100" y2="80" />
        <line x1="120" y1="0" x2="120" y2="80" />
        <line x1="140" y1="0" x2="140" y2="80" />
        <line x1="0" y1="20" x2="160" y2="20" />
        <line x1="0" y1="40" x2="160" y2="40" />
        <line x1="0" y1="60" x2="160" y2="60" />
      </g>

      {/* Comic Panels layout inside, which gets scrambled */}
      <g className="comic-panels-base">
        {/* Left Panel */}
        <rect
          x="15"
          y="12"
          width="60"
          height="56"
          fill="url(#panelGrad)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
          rx="2"
        />
        {/* Right Panel */}
        <rect
          x="85"
          y="12"
          width="60"
          height="56"
          fill="url(#panelGrad)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
          rx="2"
        />

        {/* Slices of scrambled graphics */}
        <g className="scramble-slices">
          {/* Slice 1 (Shifted Left) */}
          <rect
            x="-8"
            y="16"
            width="180"
            height="4"
            fill="#00ffff"
            opacity="0.6"
            className="scramble-slice-1"
          />
          <rect
            x="-4"
            y="16"
            width="170"
            height="4"
            fill="#ffffff"
            opacity="0.3"
            className="scramble-slice-1"
          />

          {/* Slice 2 (Shifted Right) */}
          <rect
            x="12"
            y="24"
            width="140"
            height="6"
            fill="#ff0055"
            opacity="0.6"
            className="scramble-slice-2"
          />
          <rect
            x="8"
            y="24"
            width="145"
            height="6"
            fill="#ffffff"
            opacity="0.25"
            className="scramble-slice-2"
          />

          {/* Slice 3 (Shifted Left) */}
          <rect
            x="-12"
            y="34"
            width="180"
            height="5"
            fill="#00ffff"
            opacity="0.5"
            className="scramble-slice-3"
          />
          <rect
            x="-7"
            y="34"
            width="170"
            height="5"
            fill="#ffffff"
            opacity="0.3"
            className="scramble-slice-3"
          />

          {/* Slice 4 (Shifted Right) */}
          <rect
            x="6"
            y="44"
            width="150"
            height="8"
            fill="#ff0055"
            opacity="0.7"
            className="scramble-slice-4"
          />
          <rect
            x="10"
            y="44"
            width="140"
            height="8"
            fill="#ffffff"
            opacity="0.2"
            className="scramble-slice-4"
          />

          {/* Slice 5 (Shifted Left) */}
          <rect
            x="-6"
            y="56"
            width="175"
            height="4"
            fill="#00ffff"
            opacity="0.6"
            className="scramble-slice-5"
          />
          <rect
            x="-2"
            y="56"
            width="165"
            height="4"
            fill="#ffffff"
            opacity="0.35"
            className="scramble-slice-5"
          />
        </g>

        {/* Central visual lock symbol */}
        <g className="center-symbol" transform="translate(80, 40)">
          <circle r="14" fill="#ff0055" opacity="0.15" />
          <circle
            r="10"
            fill="none"
            stroke="#ff0055"
            strokeWidth="1.5"
            opacity="0.8"
          />
          <path d="M -6 -3 L 6 -3 L 6 3 L -6 3 Z" fill="#ffffff" />
          <path
            d="M -3 -3 L -3 -7 C -3 -9, 3 -9, 3 -7 L 3 -3"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </g>
      </g>

      {/* Horizontal scanlines overlay */}
      <g stroke="#000000" strokeWidth="0.5" opacity="0.25">
        <line x1="0" y1="4" x2="160" y2="4" />
        <line x1="0" y1="8" x2="160" y2="8" />
        <line x1="0" y1="12" x2="160" y2="12" />
        <line x1="0" y1="16" x2="160" y2="16" />
        <line x1="0" y1="20" x2="160" y2="20" />
        <line x1="0" y1="24" x2="160" y2="24" />
        <line x1="0" y1="28" x2="160" y2="28" />
        <line x1="0" y1="32" x2="160" y2="32" />
        <line x1="0" y1="36" x2="160" y2="36" />
        <line x1="0" y1="40" x2="160" y2="40" />
        <line x1="0" y1="44" x2="160" y2="44" />
        <line x1="0" y1="48" x2="160" y2="48" />
        <line x1="0" y1="52" x2="160" y2="52" />
        <line x1="0" y1="56" x2="160" y2="56" />
        <line x1="0" y1="60" x2="160" y2="60" />
        <line x1="0" y1="64" x2="160" y2="64" />
        <line x1="0" y1="68" x2="160" y2="68" />
        <line x1="0" y1="72" x2="160" y2="72" />
        <line x1="0" y1="76" x2="160" y2="76" />
      </g>
    </svg>
  );
};

const NoiseIllustration = () => {
  return (
    <svg
      className="illustration-noise"
      viewBox="0 0 160 80"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="noiseBgGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#2a164d" />
          <stop offset="100%" stopColor="#0a0514" />
        </radialGradient>

        {/* Turbulence generates multi-colored RGB pixel static noise */}
        <filter id="staticFilter" x="0" y="0" width="160" height="80">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            result="noise"
          >
            <animate
              attributeName="seed"
              from="1"
              to="100"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feColorMatrix
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.5 0"
          />
        </filter>
      </defs>

      {/* Rich gradient base */}
      <rect width="100%" height="100%" fill="url(#noiseBgGrad)" />

      {/* Live animated noise layer */}
      <rect width="100%" height="100%" filter="url(#staticFilter)" />

      {/* Subtle scanline overlay */}
      <g stroke="rgba(0, 0, 0, 0.15)" strokeWidth="0.5">
        <line x1="0" y1="10" x2="160" y2="10" />
        <line x1="0" y1="20" x2="160" y2="20" />
        <line x1="0" y1="30" x2="160" y2="30" />
        <line x1="0" y1="40" x2="160" y2="40" />
        <line x1="0" y1="50" x2="160" y2="50" />
        <line x1="0" y1="60" x2="160" y2="60" />
        <line x1="0" y1="70" x2="160" y2="70" />
      </g>

      {/* Central visual lock symbol */}
      <g className="center-symbol" transform="translate(80, 40)">
        <circle r="14" fill="#00e5ff" opacity="0.15" />
        <circle
          r="10"
          fill="none"
          stroke="#00e5ff"
          strokeWidth="1.5"
          opacity="0.8"
        />
        <path d="M -6 -3 L 6 -3 L 6 3 L -6 3 Z" fill="#ffffff" />
        <path
          d="M -3 -3 L -3 -7 C -3 -9, 3 -9, 3 -7 L 3 -3"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
};

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
                  <span
                    className={`password-method-illustration ${option.value}`}
                  >
                    {option.value === 'scanline' ? (
                      <ScanlineIllustration />
                    ) : (
                      <NoiseIllustration />
                    )}
                  </span>
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
