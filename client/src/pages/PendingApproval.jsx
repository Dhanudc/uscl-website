import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PendingApproval() {
  const { user, loading, logout, refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/register");
    if (!loading && user?.role === "admin") navigate("/admin");
    if (!loading && user?.status === "approved") navigate("/dashboard");
  }, [loading, user, navigate]);

  useEffect(() => {
    const id = setInterval(() => {
      refresh();
    }, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  if (loading || !user) {
    return <section className="px-4 py-20 text-center text-[color:var(--text-muted)]">Loading...</section>;
  }

  const rejected = user.status === "rejected";

  return (
    <section className="arena px-4 py-14">
      <div className="mx-auto max-w-lg text-center">
        <p className="eyebrow mx-auto inline-flex">Account status</p>
        <h1 className="page-title mt-2">
          {rejected ? "Account rejected" : "Waiting for admin approval"}
        </h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          {rejected
            ? "An admin rejected this account. Contact support if you think this is a mistake."
            : "Your account is saved in the database. An admin must Approve you in the Admin Portal before you can use the player dashboard or register."}
        </p>
        <div className="panel mt-6 rounded-lg p-4 text-left text-sm">
          <p>
            <span className="text-[color:var(--text-muted)]">Email:</span> {user.email}
          </p>
          <p className="mt-1">
            <span className="text-[color:var(--text-muted)]">Status:</span>{" "}
            <span
              className={`font-semibold uppercase ${
                rejected ? "text-accent-soft" : "text-amber-300"
              }`}
            >
              {user.status || "pending"}
            </span>
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/home" className="btn-ghost">
            Back to home
          </Link>
          <button type="button" className="btn-primary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </section>
  );
}
