import { useRef, useState } from 'react';

export default function PasswordVisibilityInput({ value, onChange, onKeyDown, placeholder, autoFocus, autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const toggle = () => {
    setVisible(current => !current);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  return (
    <span className="access-password-control">
      <input
        ref={inputRef}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className={`access-password-toggle${visible ? ' is-open' : ''}`}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        title={visible ? 'Ocultar senha' : 'Mostrar senha'}
        onMouseDown={event => event.preventDefault()}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path className="access-eye-open" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
          <circle className="access-eye-pupil" cx="12" cy="12" r="3" />
          <path className="access-eye-closed" d="M3 12c2.3 2.4 5.3 3.6 9 3.6s6.7-1.2 9-3.6" />
        </svg>
      </button>
    </span>
  );
}
