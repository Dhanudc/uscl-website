import { Link } from "react-router-dom";
import StoreHeader from "../StoreHeader";
import { storePath } from "../urls";

/** Shown when product list or checkout API calls fail. */
export default function StoreApiErrorPanel({ message, title = "Could not load store data" }) {
  const isOffline =
    /cannot reach the api|start the backend|port 5000/i.test(String(message || "")) ||
    import.meta.env.DEV;

  return (
    <div className="rounded-xl border border-accent/40 bg-ink-card p-6 text-sm">
      <p className="font-display text-lg text-[color:var(--title)]">{title}</p>
      {message ? <p className="mt-2 text-[color:var(--text-muted)]">{message}</p> : null}
      {isOffline ? (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[color:var(--text-muted)]">
          <li>
            Open a terminal in <code className="text-accent">uscl-website</code>
          </li>
          <li>
            Run <code className="text-accent">npm run dev</code> (client + API) or{" "}
            <code className="text-accent">npm run dev:server</code> if the client is already running
          </li>
          <li>
            Check{" "}
            <a href="http://localhost:5000/api/health" className="text-accent underline" target="_blank" rel="noreferrer">
              localhost:5000/api/health
            </a>
          </li>
          <li>Refresh this page</li>
        </ol>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link to={storePath("/cart")} className="btn-ghost text-xs">
          View cart
        </Link>
        <button type="button" className="btn-primary text-xs" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    </div>
  );
}
