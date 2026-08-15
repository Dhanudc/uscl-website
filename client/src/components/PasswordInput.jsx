import { useState } from "react";

export default function PasswordInput({ label, className = "input-dark", ...props }) {
  const [show, setShow] = useState(false);

  const input = (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[color:var(--text-muted)]"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );

  if (!label) return input;

  return (
    <label className="block text-sm">
      <span className="text-[color:var(--text-muted)]">{label}</span>
      <div className="mt-1">{input}</div>
    </label>
  );
}
