import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import PasswordInput from "../components/PasswordInput";
import ThemePicker from "../components/ThemePicker";
import ZoomableImage from "../components/ZoomableImage";
import { useAuth } from "../context/AuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { franchises as franchiseCatalog } from "../data/franchises";
import { playerRoleLabel } from "../data/playerRoles";
import {
  DEFAULT_MODULE_VISIBILITY,
  normalizeModuleVisibility,
  SITE_MODULES,
} from "../data/siteModules";
import { paymentScreenshotUrl, profileImageUrl, compressImageForUpload } from "../utils/media";
import PortalMediaManager from "../components/admin/PortalMediaManager.jsx";
import SponsorPackagesAdmin from "../components/admin/SponsorPackagesAdmin.jsx";
import { AlertBanner, PageLoader, StatGridSkeleton } from "../components/ui";
import { getPaymentStatus, paymentStatusLabel } from "../utils/paymentStatus";
import AdminLivePage from "./AdminLive";

function StatusBadge({ status }) {
  const label =
    status === "verified"
      ? "accepted"
      : status === "approved"
        ? "accepted"
        : status === "not_listed"
          ? "not listed"
          : status;
  const colors = {
    pending: "border-amber-400/50 text-amber-300",
    accepted: "border-emerald-400/50 text-emerald-300",
    approved: "border-emerald-400/50 text-emerald-300",
    rejected: "border-accent/50 text-accent-soft",
    verified: "border-emerald-400/50 text-emerald-300",
    not_listed: "border-[color:var(--border-strong)] text-[color:var(--text-muted)]",
    unsold: "border-amber-400/50 text-amber-300",
    sold: "border-emerald-400/50 text-emerald-300",
  };
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        colors[status] || colors[label] || "border-[color:var(--border-strong)] text-[color:var(--text-muted)]"
      }`}
    >
      {label}
    </span>
  );
}

function StatCard({ label, value, to, shortcut = false }) {
  const inner = (
    <div className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4 transition hover:border-accent/40">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{label}</p>
      {shortcut ? (
        <p className="ui-stat-shortcut mt-1">Open →</p>
      ) : (
        <p className="font-display mt-1 text-3xl text-accent">{value ?? "—"}</p>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function AdminShell({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const adminNavGroups = [
    {
      label: "Main",
      links: [{ to: "/admin", label: "Overview", end: true }],
    },
    {
      label: "Players",
      links: [
        { to: "/admin/players/pending", label: "Pending players" },
        { to: "/admin/players/accepted", label: "Accepted players" },
        { to: "/admin/players/rejected", label: "Rejected players" },
      ],
    },
    {
      label: "League",
      links: [
        { to: "/admin/teams", label: "Teams" },
        { to: "/admin/auction", label: "Auction desk" },
        { to: "/admin/live", label: "Live updates" },
      ],
    },
    {
      label: "Settings",
      links: [
        { to: "/admin/settings", label: "Settings" },
        { to: "/admin/passwords", label: "Reset passwords" },
        { to: "/admin/fees", label: "Registration fees" },
        { to: "/admin/sponsors", label: "Sponsor packages" },
        { to: "/admin/media", label: "Portal media" },
        { to: "/admin/social", label: "Social media" },
        { to: "/admin/audit", label: "Audit log" },
      ],
    },
  ];

  const desktopLinks = adminNavGroups.flatMap((group) => group.links);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("mobile-nav-open", menuOpen);
    return () => document.body.classList.remove("mobile-nav-open");
  }, [menuOpen]);

  function adminNavClass(isActive) {
    return `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
      isActive
        ? "bg-accent text-white"
        : "text-[color:var(--text-muted)] hover:bg-[color:var(--ink-soft)] hover:text-[color:var(--text)]"
    }`;
  }

  return (
    <div className="min-h-screen bg-ink text-[color:var(--title)]">
      <header className="site-header sticky top-0 z-40 border-b border-[color:var(--border)] bg-ink-soft">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
          <Link to="/admin" className="flex min-w-0 items-center gap-2.5">
            <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-[11px] text-white">
              ADM
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-base leading-none text-[color:var(--title)] sm:text-lg">
                USCL Admin
              </span>
              <span className="hidden truncate text-[10px] text-[color:var(--text-muted)] sm:block">
                {user?.email}
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemePicker compact />
            <Link to="/home" className="btn-ghost !py-1.5 !text-xs">
              Public site
            </Link>
            <button
              type="button"
              className="btn-ghost !py-1.5 !text-xs"
              onClick={async () => {
                await logout();
                navigate("/admin/login");
              }}
            >
              Logout
            </button>
          </div>

          <button
            type="button"
            className="mobile-menu-btn inline-flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--border)] text-[color:var(--text)] lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="admin-nav-panel"
            aria-label={menuOpen ? "Close admin menu" : "Open admin menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="mobile-menu-icon" aria-hidden="true" />
          </button>
        </div>
      </header>

      <nav className="hidden border-b border-[color:var(--border)] bg-ink-soft lg:block">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 py-2">
          {desktopLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  isActive
                    ? "bg-accent text-white"
                    : "text-[color:var(--text-muted)] hover:bg-[color:color-mix(in_srgb,var(--text)_8%,transparent)] hover:text-[color:var(--text)]"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {menuOpen ? (
        <div className="admin-mobile-nav lg:hidden">
          <button
            type="button"
            className="admin-mobile-nav-backdrop"
            aria-label="Close admin menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside
            id="admin-nav-panel"
            className="admin-mobile-nav-panel"
            aria-label="Admin navigation"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-4 py-4">
              <div className="min-w-0">
                <p className="font-display text-lg text-accent">Admin menu</p>
                <p className="mt-1 truncate text-xs text-[color:var(--text-muted)]">{user?.email}</p>
              </div>
              <button
                type="button"
                className="btn-ghost shrink-0 !px-2.5 !py-1.5 !text-xs"
                onClick={() => setMenuOpen(false)}
              >
                Close
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
              {adminNavGroups.map((group) => (
                <div key={group.label} className="mb-4 last:mb-0">
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        className={({ isActive }) => adminNavClass(isActive)}
                      >
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="space-y-2 border-t border-[color:var(--border)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2">
                <span className="text-xs font-semibold text-[color:var(--text-muted)]">Theme</span>
                <ThemePicker compact />
              </div>
              <Link to="/home" className="btn-ghost w-full justify-center">
                Public site
              </Link>
              <button
                type="button"
                className="btn-primary w-full justify-center"
                onClick={async () => {
                  await logout();
                  navigate("/admin/login");
                }}
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-5">
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[color:var(--text-muted)]">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}

function OverviewPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api("/api/admin/stats")
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell
      title="Season overview"
      subtitle="Open each page to review pending, accepted, or rejected players."
    >
      {error ? (
        <div className="mb-4">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}
      {loading ? (
        <StatGridSkeleton count={12} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total registered" value={stats?.registrationsCount} to="/admin/players/pending" />
          <StatCard label="Pending players" value={stats?.pendingRegs} to="/admin/players/pending" />
          <StatCard label="Accepted players" value={stats?.verifiedRegs} to="/admin/players/accepted" />
          <StatCard label="Rejected players" value={stats?.rejectedRegs} to="/admin/players/rejected" />
          <StatCard label="Sold in auction" value={stats?.auctionSold} to="/admin/auction" />
          <StatCard label="Unsold" value={stats?.auctionUnsold} to="/admin/auction" />
          <StatCard label="Teams roster" value="8" to="/admin/teams" />
          <StatCard label="Settings" shortcut to="/admin/settings" />
          <StatCard label="Reset passwords" shortcut to="/admin/passwords" />
          <StatCard label="Registration fees" shortcut to="/admin/fees" />
          <StatCard label="Sponsor packages" shortcut to="/admin/sponsors" />
          <StatCard label="Portal media" shortcut to="/admin/media" />
          <StatCard label="Social media" shortcut to="/admin/social" />
          <StatCard label="Live updates" shortcut to="/admin/live" />
          <StatCard label="Audit log" shortcut to="/admin/audit" />
        </div>
      )}
    </AdminShell>
  );
}

function PlayersPage() {
  const { status } = useParams();
  const navigate = useNavigate();
  const page = ["pending", "accepted", "rejected"].includes(status) ? status : "pending";
  const apiStatus = page === "accepted" ? "verified" : page;
  const [regs, setRegs] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [screenshotModal, setScreenshotModal] = useState(null);
  const [paymentModalReg, setPaymentModalReg] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [paymentModalError, setPaymentModalError] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [activityModal, setActivityModal] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [payNowConfirmReg, setPayNowConfirmReg] = useState(null);
  const [enablingPayNow, setEnablingPayNow] = useState(false);
  const [markPaidConfirmReg, setMarkPaidConfirmReg] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [ownerTeam, setOwnerTeam] = useState({});
  const [interestFilter, setInterestFilter] = useState("franchise");
  const [loading, setLoading] = useState(true);
  const [imageBusyId, setImageBusyId] = useState("");

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams({ status: apiStatus });
    if (["captain", "player", "franchise", "sponsor"].includes(interestFilter)) {
      qs.set("interest", interestFilter);
    }
    const data = await api(`/api/admin/registrations?${qs.toString()}`);
    setRegs(data.registrations || []);
    const seed = {};
    const teams = {};
    for (const item of data.registrations || []) {
      seed[item._id] = item.adminNotes || "";
      teams[item._id] = item.franchiseId || "";
    }
    setNotes(seed);
    setOwnerTeam(teams);
    setLoading(false);
  }

  useEffect(() => {
    setMessage("");
    setError("");
    load().catch((err) => {
      setLoading(false);
      setError(err.message);
      if (/admin access/i.test(err.message)) {
        navigate("/admin/login", { replace: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiStatus, interestFilter]);

  useEffect(() => {
    if (page === "pending") setInterestFilter("franchise");
  }, [page]);

  useEffect(() => {
    if (!paymentModalReg) return;
    setUtrNumber(String(paymentModalReg.utrNumber || "").trim());
  }, [paymentModalReg]);

  async function openActivityModal(reg) {
    setActivityModal(reg);
    setActivities([]);
    setActivityError("");
    setActivityLoading(true);
    try {
      const data = await api(`/api/admin/registrations/${reg._id}/activities`);
      setActivities(data.activities || []);
    } catch (err) {
      setActivityError(err.message || "Unable to load activity.");
    } finally {
      setActivityLoading(false);
    }
  }

  function closeActivityModal() {
    setActivityModal(null);
    setActivities([]);
    setActivityError("");
  }

  async function updateReg(id, nextStatus) {
    setBusyId(id);
    setError("");
    setMessage("");
    const current = regs.find((r) => String(r._id) === String(id));
    if (
      current?.interest === "franchise" &&
      nextStatus === "verified" &&
      !ownerTeam[id]
    ) {
      setError("Assign a franchise team before accepting.");
      setBusyId("");
      return;
    }
    try {
      const payload = { status: nextStatus, adminNotes: notes[id] || "" };
      const teamId = ownerTeam[id];
      if (teamId) payload.franchiseId = teamId;
      await api(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMessage(
        nextStatus === "verified"
          ? "Player accepted. Moved to Accepted players page."
          : nextStatus === "rejected"
            ? "Player rejected. Moved to Rejected players page."
            : "Updated."
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function changeProfileImage(reg, file) {
    if (!reg?._id || !file) return;
    setImageBusyId(reg._id);
    setError("");
    setMessage("");
    try {
      const compressed = await compressImageForUpload(file);
      const formData = new FormData();
      formData.set("fullName", reg.fullName || "player");
      formData.set("photo", compressed, compressed.name || file.name || "photo.jpg");

      const data = await api(`/api/admin/registrations/${reg._id}/profile-image`, {
        method: "PATCH",
        body: formData,
      });

      setRegs((prev) =>
        prev.map((r) => (String(r._id) === String(data.registration._id) ? data.registration : r))
      );
      setMessage(`Profile image updated for ${data.registration.fullName}.`);
    } catch (err) {
      setError(err.message || "Unable to update profile image.");
    } finally {
      setImageBusyId("");
    }
  }

  async function downloadScreenshot(url, filename) {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Unable to download screenshot.");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || "payment-screenshot.jpg";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err.message || "Download failed.");
    }
  }

  function missingPaymentDetails(reg) {
    return !String(reg?.utrNumber || "").trim() || !paymentScreenshotUrl(reg);
  }

  function hasPaymentEvidence(reg) {
    return Boolean(String(reg?.utrNumber || "").trim()) || Boolean(paymentScreenshotUrl(reg));
  }

  function canMarkPaymentPaid(reg) {
    return getPaymentStatus(reg) !== "paid" && hasPaymentEvidence(reg);
  }

  function canEnablePayNow(reg) {
    return getPaymentStatus(reg) !== "paid" && !reg?.payNowEnabled;
  }

  async function confirmMarkPaymentPaid() {
    if (!markPaidConfirmReg) return;
    setMarkingPaid(true);
    setError("");
    try {
      const data = await api(
        `/api/admin/registrations/${markPaidConfirmReg._id}/mark-payment-paid`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        }
      );
      setRegs((prev) =>
        prev.map((r) =>
          String(r._id) === String(data.registration._id) ? data.registration : r
        )
      );
      if (paymentModalReg && String(paymentModalReg._id) === String(data.registration._id)) {
        setPaymentModalReg(data.registration);
      }
      setMessage(`Payment marked as paid for ${data.registration.fullName}.`);
      setMarkPaidConfirmReg(null);
      if (
        paymentModalReg &&
        String(paymentModalReg._id) === String(data.registration._id)
      ) {
        closePaymentModal();
      }
    } catch (err) {
      setError(err.message || "Unable to mark payment as paid.");
    } finally {
      setMarkingPaid(false);
    }
  }

  async function confirmEnablePayNow() {
    if (!payNowConfirmReg) return;
    setEnablingPayNow(true);
    setError("");
    try {
      const data = await api(`/api/admin/registrations/${payNowConfirmReg._id}/enable-pay-now`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setRegs((prev) =>
        prev.map((r) =>
          String(r._id) === String(data.registration._id) ? data.registration : r
        )
      );
      setMessage(`Pay now enabled for ${data.registration.fullName}.`);
      setPayNowConfirmReg(null);
    } catch (err) {
      setError(err.message || "Unable to enable Pay now.");
    } finally {
      setEnablingPayNow(false);
    }
  }

  function openPaymentModal(reg) {
    const existingUtr = String(reg?.utrNumber || "").trim();
    setPaymentModalReg(reg);
    setUtrNumber(existingUtr);
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview("");
    setPaymentModalError("");
  }

  function closePaymentModal() {
    setPaymentModalReg(null);
    setUtrNumber("");
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview("");
    setPaymentModalError("");
  }

  async function saveAdminPaymentDetails({ closeOnSave = true } = {}) {
    if (!paymentModalReg) return null;
    setPaymentModalError("");
    setSavingPayment(true);
    try {
      const nextUtr = utrNumber.trim().toUpperCase();
      const prevUtr = String(paymentModalReg.utrNumber || "").trim().toUpperCase();
      const utrChanged = Boolean(nextUtr) && nextUtr !== prevUtr;
      const shotChanged = Boolean(screenshotFile);

      if (!utrChanged && !shotChanged) {
        if (closeOnSave) {
          throw new Error("No payment changes to save. Update UTR or upload a new screenshot.");
        }
        return paymentModalReg;
      }

      if (!utrNumber.trim() && !screenshotFile && !paymentScreenshotUrl(paymentModalReg)) {
        throw new Error("Please add a UTR number or payment screenshot.");
      }

      const formData = new FormData();
      formData.set("fullName", paymentModalReg.fullName || "player");
      formData.set("utrNumber", utrNumber.trim());
      if (screenshotFile) {
        formData.set("paymentScreenshot", screenshotFile);
      }

      const data = await api(`/api/admin/registrations/${paymentModalReg._id}/payment-details`, {
        method: "PATCH",
        body: formData,
      });

      setRegs((prev) =>
        prev.map((r) => (String(r._id) === String(data.registration._id) ? data.registration : r))
      );
      setPaymentModalReg(data.registration);
      setMessage(`Payment details saved for ${data.registration.fullName}.`);
      if (closeOnSave) closePaymentModal();
      return data.registration;
    } catch (err) {
      setPaymentModalError(err.message);
      throw err;
    } finally {
      setSavingPayment(false);
    }
  }

  async function markPaidFromModal() {
    if (!paymentModalReg) return;
    setPaymentModalError("");
    try {
      let reg = paymentModalReg;
      const nextUtr = utrNumber.trim().toUpperCase();
      const prevUtr = String(paymentModalReg.utrNumber || "").trim().toUpperCase();
      const needsSave =
        (Boolean(nextUtr) && nextUtr !== prevUtr) || Boolean(screenshotFile);

      if (needsSave) {
        reg = await saveAdminPaymentDetails({ closeOnSave: false });
      }

      const evidence =
        Boolean(String(reg?.utrNumber || "").trim()) ||
        Boolean(paymentScreenshotUrl(reg)) ||
        Boolean(utrNumber.trim()) ||
        Boolean(screenshotFile);

      if (!evidence) {
        throw new Error("Add a UTR number or payment screenshot before marking as paid.");
      }

      if (!needsSave && canMarkPaymentPaid(reg)) {
        setMarkPaidConfirmReg(reg);
        return;
      }

      if (needsSave && reg) {
        setMarkPaidConfirmReg(reg);
      }
    } catch (err) {
      if (!paymentModalError) setPaymentModalError(err.message);
    }
  }

  const titles = {
    pending: ["Pending franchises", "Assign a team, then accept or reject. After accept they leave this page."],
    accepted: ["Accepted players", "Players you already accepted. No action needed."],
    rejected: ["Rejected players", "Players you already rejected."],
  };

  return (
    <AdminShell title={titles[page][0]} subtitle={titles[page][1]}>
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["captain", "Captain"],
          ["player", "Player"],
          ["franchise", "Franchise"],
          ["sponsor", "Sponsor"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setInterestFilter(key)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              interestFilter === key
                ? "bg-accent text-white"
                : "border border-[color:var(--border-strong)] text-[color:var(--text-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["pending", "Pending"],
          ["accepted", "Accepted"],
          ["rejected", "Rejected"],
        ].map(([key, label]) => (
          <Link
            key={key}
            to={`/admin/players/${key}`}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              page === key ? "bg-accent text-white" : "border border-[color:var(--border-strong)] text-[color:var(--text-muted)]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {error ? (
        <div className="mb-3">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}
      {message ? (
        <div className="mb-3">
          <AlertBanner tone="ok">{message}</AlertBanner>
        </div>
      ) : null}

      {loading ? (
        <PageLoader message="Loading registrations…" />
      ) : (
      <div className="space-y-3">
        {regs.length === 0 && (
          <p className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4 text-sm text-[color:var(--text-muted)]">
            No {page} {interestFilter === "all" ? "registrations" : `${interestFilter}s`} yet.
            {interestFilter !== "all" ? " Switch to All to see every type." : ""}
          </p>
        )}
        {regs.map((reg) => {
          const shotUrl = paymentScreenshotUrl(reg);
          return (
          <article key={reg._id} className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                  {profileImageUrl(reg) ? (
                    <ZoomableImage
                      src={profileImageUrl(reg)}
                      alt={reg.fullName}
                      className="h-14 w-14 rounded-lg border border-[color:var(--border)] object-cover bg-ink-soft"
                    />
                  ) : (
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-accent/15 text-accent">
                      <PlayerIcon size={22} />
                    </span>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={imageBusyId === reg._id || busyId === reg._id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) changeProfileImage(reg, file);
                      }}
                    />
                    <span
                      className={`inline-flex rounded border border-[color:var(--border-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        imageBusyId === reg._id
                          ? "opacity-50"
                          : "text-accent-soft hover:border-accent hover:text-accent"
                      }`}
                    >
                      {imageBusyId === reg._id
                        ? "Uploading…"
                        : profileImageUrl(reg)
                          ? "Change image"
                          : "Add image"}
                    </span>
                  </label>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[color:var(--title)]">{reg.fullName}</p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {reg.company} · {reg.interest}
                    {reg.sponsorPackageTitle ? ` · ${reg.sponsorPackageTitle}` : ""} · {reg.email}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {reg.phone}
                    {reg.interest === "player" || reg.interest === "captain"
                      ? reg.role
                        ? ` · ${playerRoleLabel(reg.role)}`
                        : ""
                      : ""}
                    {` · Pay ${paymentStatusLabel(getPaymentStatus(reg))}${
                      reg.payment?.amountInr ? ` ₹${reg.payment.amountInr}` : ""
                    }`}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    UTR:{" "}
                    <span className="text-[color:var(--text)]">
                      {reg.utrNumber || "—"}
                    </span>
                    {" · "}
                    {shotUrl ? (
                      <button
                        type="button"
                        className="text-accent-soft underline"
                        onClick={() =>
                          setScreenshotModal({
                            url: shotUrl,
                            name: reg.fullName,
                            filename: reg.paymentScreenshot || "payment-screenshot.jpg",
                          })
                        }
                      >
                        View payment screenshot
                      </button>
                    ) : (
                      <span>No payment screenshot</span>
                    )}
                  </p>
                  {reg.paymentDetailsAddedBy || reg.paymentDetailsAddedAt ? (
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      Payment details by {reg.paymentDetailsAddedBy || "—"}
                      {reg.paymentDetailsAddedAt
                        ? ` · ${new Date(reg.paymentDetailsAddedAt).toLocaleString()}`
                        : ""}
                    </p>
                  ) : null}
                  {getPaymentStatus(reg) !== "paid" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canEnablePayNow(reg) ? (
                        <button
                          type="button"
                          className="btn-primary !py-1.5 !text-xs"
                          onClick={() => setPayNowConfirmReg(reg)}
                        >
                          Pay now
                        </button>
                      ) : null}
                      {missingPaymentDetails(reg) ? (
                        <button
                          type="button"
                          className="btn-primary !py-1.5 !text-xs"
                          onClick={() => openPaymentModal(reg)}
                        >
                          Add payment details
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-ghost !py-1.5 !text-xs"
                          onClick={() => openPaymentModal(reg)}
                        >
                          Edit payment details
                        </button>
                      )}
                      {canMarkPaymentPaid(reg) ? (
                        <button
                          type="button"
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                          onClick={() => setMarkPaidConfirmReg(reg)}
                        >
                          Mark as paid
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {reg.payNowEnabled && getPaymentStatus(reg) !== "paid" ? (
                    <p className="mt-1 text-xs text-emerald-300">
                      Pay now enabled
                      {reg.payNowEnabledBy ? ` by ${reg.payNowEnabledBy}` : ""}
                      {reg.payNowEnabledAt
                        ? ` · ${new Date(reg.payNowEnabledAt).toLocaleString()}`
                        : ""}
                      . Player can pay from dashboard.
                    </p>
                  ) : null}
                  {reg.reviewedAt && (
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      Reviewed {new Date(reg.reviewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <StatusBadge status={reg.status} />
            </div>

            {page === "accepted" && reg.interest !== "franchise" ? (
              <div className="mt-2 text-xs text-[color:var(--text-muted)]">
                Auction: {reg.auctionStatus || "not_listed"}
                {reg.franchiseName ? ` · ${reg.franchiseName}` : ""}
              </div>
            ) : null}

            {reg.interest === "sponsor" && reg.sponsorPackageTitle ? (
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Package: <strong className="text-[color:var(--title)]">{reg.sponsorPackageTitle}</strong>
              </p>
            ) : null}
            {reg.interest === "franchise" && page === "pending" ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  Assign a team
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {ownerTeam[reg._id]
                    ? `Selected: ${
                        franchiseCatalog.find((f) => f.id === ownerTeam[reg._id])?.name || ownerTeam[reg._id]
                      }`
                    : "Pick the franchise this owner will get."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {franchiseCatalog.map((f) => {
                    const selected = ownerTeam[reg._id] === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          setOwnerTeam((prev) => ({
                            ...prev,
                            [reg._id]: selected ? "" : f.id,
                          }))
                        }
                        className={`rounded-md px-3 py-2 text-xs font-semibold ${
                          selected
                            ? "bg-accent text-white"
                            : "border border-[color:var(--border-strong)] text-[color:var(--title)]"
                        }`}
                      >
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {reg.interest === "franchise" && page === "accepted" ? (
              <p className="mt-3 text-sm text-[color:var(--text)]">
                Team:{" "}
                <strong className="text-accent">
                  {reg.franchiseName ||
                    franchiseCatalog.find((f) => f.id === (ownerTeam[reg._id] || reg.franchiseId))?.name ||
                    "Not assigned"}
                </strong>
              </p>
            ) : null}

            {page === "pending" ? (
              <>
                <textarea
                  className="input-dark mt-3"
                  rows={2}
                  value={notes[reg._id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [reg._id]: e.target.value }))}
                  placeholder="Admin notes (optional)"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      busyId === reg._id ||
                      (reg.interest === "franchise" && !ownerTeam[reg._id])
                    }
                    onClick={() => updateReg(reg._id, "verified")}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-[color:var(--title)] disabled:opacity-40"
                  >
                    {reg.interest === "franchise" ? "Accept franchise" : "Accept player"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === reg._id}
                    onClick={() => updateReg(reg._id, "rejected")}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[color:var(--title)]"
                  >
                    Reject player
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !py-1.5 !text-xs"
                    onClick={() => openActivityModal(reg)}
                  >
                    View activity
                  </button>
                </div>
              </>
            ) : (
              <>
                {reg.adminNotes ? (
                  <p className="mt-3 text-sm text-[color:var(--text-muted)]">Note: {reg.adminNotes}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === reg._id}
                    onClick={() => updateReg(reg._id, "pending")}
                    className="btn-ghost !py-1.5 !text-xs"
                  >
                    Move back to pending
                  </button>
                  {page === "accepted" && reg.interest !== "franchise" && (
                    <Link to="/admin/auction" className="btn-ghost !py-1.5 !text-xs">
                      Assign in auction
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn-ghost !py-1.5 !text-xs"
                    onClick={() => openActivityModal(reg)}
                  >
                    View activity
                  </button>
                </div>
              </>
            )}
          </article>
          );
        })}
      </div>
      )}

      {paymentModalReg ? (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-payment-details-title"
            className="modal-sheet panel w-full rounded-t-2xl p-4 sm:max-w-md sm:rounded-2xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow text-accent">Payment details</p>
            <h3
              id="admin-payment-details-title"
              className="mt-1 font-display text-xl text-[color:var(--title)]"
            >
              {paymentModalReg.fullName}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              Add UTR and payment screenshot for this player.
            </p>

            <label className="mt-4 block text-sm">
              <span className="text-[color:var(--text-muted)]">UTR number</span>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => {
                  setUtrNumber(e.target.value);
                  if (paymentModalError) setPaymentModalError("");
                }}
                className="input-dark mt-1.5"
                placeholder="Enter UTR number"
              />
              {paymentModalError && /utr/i.test(paymentModalError) ? (
                <p className="mt-1.5 text-xs text-accent">{paymentModalError}</p>
              ) : null}
            </label>

            <label className="mt-3 block text-sm">
              <span className="text-[color:var(--text-muted)]">Payment screenshot</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1.5 block w-full text-sm text-[color:var(--text-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setScreenshotFile(file);
                  if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
                  setScreenshotPreview(file ? URL.createObjectURL(file) : "");
                }}
              />
              <p className="mt-1.5 text-xs text-[color:var(--text-muted)]">
                Please add your payment screenshot
              </p>
              {screenshotPreview ? (
                <img
                  src={screenshotPreview}
                  alt="Payment screenshot preview"
                  className="mt-3 h-28 w-auto max-w-full rounded-lg border border-[color:var(--border)] object-contain"
                />
              ) : null}
            </label>

            {paymentModalError && !/utr/i.test(paymentModalError) ? (
              <p className="mt-3 text-sm text-accent">{paymentModalError}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingPayment}
                onClick={saveAdminPaymentDetails}
                className="btn-primary"
              >
                {savingPayment ? "Saving..." : "Save"}
              </button>
              {getPaymentStatus(paymentModalReg) !== "paid" &&
              (hasPaymentEvidence(paymentModalReg) ||
                utrNumber.trim() ||
                screenshotFile) ? (
                <button
                  type="button"
                  disabled={savingPayment || markingPaid}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                  onClick={markPaidFromModal}
                >
                  Mark as paid
                </button>
              ) : null}
              <button
                type="button"
                disabled={savingPayment}
                onClick={closePaymentModal}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {screenshotModal ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
          onClick={() => setScreenshotModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-shot-title"
            className="modal-sheet max-h-[90vh] w-full overflow-auto rounded-t-2xl border border-[color:var(--border)] bg-ink-card p-4 shadow-xl sm:max-w-lg sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-accent">Payment screenshot</p>
                <h3 id="payment-shot-title" className="mt-1 font-display text-xl text-[color:var(--title)]">
                  {screenshotModal.name}
                </h3>
              </div>
              <button
                type="button"
                className="btn-ghost !py-1.5 !text-xs"
                onClick={() => setScreenshotModal(null)}
              >
                Close
              </button>
            </div>
            <img
              src={screenshotModal.url}
              alt={`Payment screenshot for ${screenshotModal.name}`}
              className="mt-4 max-h-[60vh] w-full rounded-lg border border-[color:var(--border)] object-contain bg-ink-soft"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  downloadScreenshot(screenshotModal.url, screenshotModal.filename)
                }
              >
                Download
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setScreenshotModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activityModal ? (
        <div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
          onClick={closeActivityModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-activity-title"
            className="modal-sheet max-h-[90vh] w-full overflow-auto rounded-t-2xl border border-[color:var(--border)] bg-ink-card p-4 shadow-xl sm:max-w-lg sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-accent">Player activity</p>
                <h3
                  id="player-activity-title"
                  className="mt-1 font-display text-xl text-[color:var(--title)]"
                >
                  {activityModal.fullName}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">{activityModal.email}</p>
              </div>
              <button
                type="button"
                className="btn-ghost !py-1.5 !text-xs"
                onClick={closeActivityModal}
              >
                Close
              </button>
            </div>

            {activityLoading ? (
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">Loading activity…</p>
            ) : activityError ? (
              <p className="mt-4 text-sm text-accent">{activityError}</p>
            ) : activities.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">
                No activity recorded for this player yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {activities.map((item) => (
                  <li
                    key={item._id}
                    className="border-b border-[color:var(--border)] pb-3 last:border-0 last:pb-0"
                  >
                    <p className="text-sm text-[color:var(--text)]">{item.summary}</p>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                      {item.actorName ? ` · by ${item.actorName}` : ""}
                      {item.actorRole ? ` · ${item.actorRole}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {markPaidConfirmReg ? (
        <div
          className="fixed inset-0 z-[96] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
          onClick={() => !markingPaid && setMarkPaidConfirmReg(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-paid-title"
            className="modal-sheet panel w-full rounded-t-2xl p-4 sm:max-w-md sm:rounded-2xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow text-accent">Confirm</p>
            <h3
              id="mark-paid-title"
              className="mt-1 font-display text-xl text-[color:var(--title)]"
            >
              Mark payment as paid?
            </h3>
            <p className="mt-3 text-sm text-[color:var(--text-muted)]">
              Confirm offline payment for{" "}
              <span className="text-[color:var(--text)]">{markPaidConfirmReg.fullName}</span>
              {markPaidConfirmReg.payment?.amountInr
                ? ` (₹${markPaidConfirmReg.payment.amountInr})`
                : ""}
              . UTR or payment screenshot must already be on file.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                disabled={markingPaid}
                onClick={confirmMarkPaymentPaid}
              >
                {markingPaid ? "Saving..." : "Yes, mark as paid"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={markingPaid}
                onClick={() => setMarkPaidConfirmReg(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {payNowConfirmReg ? (
        <div
          className="fixed inset-0 z-[96] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
          onClick={() => !enablingPayNow && setPayNowConfirmReg(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="enable-pay-now-title"
            className="modal-sheet panel w-full rounded-t-2xl p-4 sm:max-w-md sm:rounded-2xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow text-accent">Confirm</p>
            <h3
              id="enable-pay-now-title"
              className="mt-1 font-display text-xl text-[color:var(--title)]"
            >
              Enable Pay now?
            </h3>
            <p className="mt-3 text-sm text-[color:var(--text-muted)]">
              This will show a <span className="text-[color:var(--text)]">Pay now</span> button on{" "}
              <span className="text-[color:var(--text)]">{payNowConfirmReg.fullName}</span>
              {"'s"} dashboard so they can complete online payment.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={enablingPayNow}
                onClick={confirmEnablePayNow}
              >
                {enablingPayNow ? "Saving..." : "Yes, enable"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={enablingPayNow}
                onClick={() => setPayNowConfirmReg(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

function PasswordResetBox({ userId, busyId, onSave }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  async function handleSave() {
    await onSave(userId, password);
    setPassword("");
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="mt-3">
        <button
          type="button"
          title="Set / reset password"
          aria-label="Set or reset password"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--text)_8%,transparent)] text-[color:var(--text-muted)] hover:border-accent/50 hover:text-accent-soft"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7 11V8a5 5 0 0 1 10 0v3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <rect
              x="5"
              y="11"
              width="14"
              height="10"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <circle cx="12" cy="16" r="1.2" fill="currentColor" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--text)_6%,transparent)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Set / reset password
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPassword("");
          }}
          className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
        >
          Close
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <PasswordInput
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min 6 chars)"
          className="input-dark min-w-0 flex-1 sm:!w-auto sm:min-w-[220px]"
        />
        <button
          type="button"
          disabled={busyId === userId || password.length < 6}
          onClick={handleSave}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[color:var(--title)] disabled:opacity-40"
        >
          Save password
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-[color:var(--text-muted)]">
        Share this password with the player so they can sign in.
      </p>
    </div>
  );
}

function AccountsPage() {
  const { status } = useParams();
  const page = ["pending", "accepted", "rejected"].includes(status) ? status : "pending";
  const apiStatus = page === "accepted" ? "approved" : page;
  const [users, setUsers] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api(`/api/admin/users?status=${apiStatus}`);
    setUsers(data.users || []);
    const seed = {};
    for (const item of data.users || []) seed[item._id] = item.adminNotes || "";
    setNotes(seed);
  }

  useEffect(() => {
    setMessage("");
    setError("");
    load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiStatus]);

  async function updateUser(id, nextStatus) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, adminNotes: notes[id] || "" }),
      });
      setMessage(
        nextStatus === "approved"
          ? "Account accepted. Moved to Accepted accounts page."
          : nextStatus === "rejected"
            ? "Account rejected. Moved to Rejected accounts page."
            : "Updated."
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function setPassword(id, password) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const data = await api(`/api/admin/users/${id}/password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setMessage(data.message || "Password updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  const titles = {
    pending: ["Pending accounts", "Approve signup accounts here."],
    accepted: ["Accepted accounts", "Users already approved. You can also reset passwords here."],
    rejected: ["Rejected accounts", "Users already rejected."],
  };

  return (
    <AdminShell title={titles[page][0]} subtitle={titles[page][1]}>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["pending", "Pending"],
          ["accepted", "Accepted"],
          ["rejected", "Rejected"],
        ].map(([key, label]) => (
          <Link
            key={key}
            to={`/admin/accounts/${key}`}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              page === key ? "bg-accent text-white" : "border border-[color:var(--border-strong)] text-[color:var(--text-muted)]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-accent">{error}</p>}
      {message && <p className="mb-3 text-sm text-emerald-300">{message}</p>}

      <div className="space-y-3">
        {users.length === 0 && (
          <p className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4 text-sm text-[color:var(--text-muted)]">
            No {page} accounts yet.
          </p>
        )}
        {users.map((u) => (
          <article key={u._id} className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[color:var(--title)]">{u.name}</p>
                <p className="text-sm text-[color:var(--text-muted)]">
                  {u.email}
                  {u.phone ? ` · ${u.phone}` : ""}
                </p>
              </div>
              <StatusBadge status={u.status || "pending"} />
            </div>

            {page === "pending" ? (
              <>
                <textarea
                  className="input-dark mt-3"
                  rows={2}
                  value={notes[u._id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [u._id]: e.target.value }))}
                  placeholder="Admin notes (optional)"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === u._id}
                    onClick={() => updateUser(u._id, "approved")}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-[color:var(--title)]"
                  >
                    Accept account
                  </button>
                  <button
                    type="button"
                    disabled={busyId === u._id}
                    onClick={() => updateUser(u._id, "rejected")}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[color:var(--title)]"
                  >
                    Reject account
                  </button>
                </div>
              </>
            ) : (
              <>
                {u.adminNotes ? (
                  <p className="mt-3 text-sm text-[color:var(--text-muted)]">Note: {u.adminNotes}</p>
                ) : null}
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={busyId === u._id}
                    onClick={() => updateUser(u._id, "pending")}
                    className="btn-ghost !py-1.5 !text-xs"
                  >
                    Move back to pending
                  </button>
                </div>
              </>
            )}

            <PasswordResetBox userId={u._id} busyId={busyId} onSave={setPassword} />
          </article>
        ))}
      </div>
    </AdminShell>
  );
}

function PasswordsPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    const data = await api("/api/admin/users");
    setUsers(data.users || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function setPassword(id, password) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const data = await api(`/api/admin/users/${id}/password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setMessage(data.message || "Password updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell
      title="Reset player passwords"
      subtitle="When a player forgets their password, set a new one here and share it with them."
    >
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or phone"
        className="input-dark mb-4 max-w-md"
      />

      {error && <p className="mb-3 text-sm text-accent">{error}</p>}
      {message && <p className="mb-3 text-sm text-emerald-300">{message}</p>}

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4 text-sm text-[color:var(--text-muted)]">
            No matching players.
          </p>
        )}
        {filtered.map((u) => (
          <article key={u._id} className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[color:var(--title)]">{u.name}</p>
                <p className="text-sm text-[color:var(--text-muted)]">
                  {u.email}
                  {u.phone ? ` · ${u.phone}` : ""}
                </p>
              </div>
              <StatusBadge status={u.status || "pending"} />
            </div>
            <PasswordResetBox userId={u._id} busyId={busyId} onSave={setPassword} />
          </article>
        ))}
      </div>
    </AdminShell>
  );
}

function AuctionPage() {
  const [regs, setRegs] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [filter, setFilter] = useState("all");
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    setError("");
    setMessage("");
    const url =
      filter === "all"
        ? "/api/admin/registrations?status=verified"
        : `/api/admin/registrations?status=verified&auctionStatus=${filter}`;
    Promise.all([api(url), api("/api/admin/franchises")])
      .then(([r, f]) => {
        setRegs((r.registrations || []).filter((item) => item.interest !== "franchise" && item.interest !== "sponsor"));
        setFranchises(f.franchises || []);
        const seed = {};
        for (const item of r.registrations || []) {
          seed[item._id] = {
            auctionStatus: item.auctionStatus || "not_listed",
            franchiseId: item.franchiseId || "",
            basePrice: item.basePrice || 0,
            soldPrice: item.soldPrice || 0,
          };
        }
        setDrafts(seed);
      })
      .catch((err) => setError(err.message));
  }, [filter]);

  async function saveAuction(id) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/registrations/${id}/auction`, {
        method: "PATCH",
        body: JSON.stringify(drafts[id]),
      });
      setMessage("Auction assignment saved.");
      const url =
        filter === "all"
          ? "/api/admin/registrations?status=verified"
          : `/api/admin/registrations?status=verified&auctionStatus=${filter}`;
      const r = await api(url);
      setRegs(r.registrations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <AdminShell
      title="Auction desk"
      subtitle="Assign franchise, base price, and sold / unsold status for accepted players."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["all", "All accepted"],
          ["not_listed", "Not listed"],
          ["unsold", "Unsold"],
          ["sold", "Sold"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              filter === key ? "bg-accent text-white" : "border border-[color:var(--border-strong)] text-[color:var(--text-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-accent">{error}</p>}
      {message && <p className="mb-3 text-sm text-emerald-300">{message}</p>}

      <div className="space-y-3">
        {regs.length === 0 && (
          <p className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4 text-sm text-[color:var(--text-muted)]">
            No accepted players in this filter.
          </p>
        )}
        {regs.map((reg) => {
          const d = drafts[reg._id] || {};
          return (
            <article key={reg._id} className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {profileImageUrl(reg) ? (
                    <ZoomableImage
                      src={profileImageUrl(reg)}
                      alt={reg.fullName}
                      className="h-12 w-12 shrink-0 rounded-lg border border-[color:var(--border)] object-cover bg-ink-soft"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-semibold text-[color:var(--title)]">{reg.fullName}</p>
                    <p className="text-sm text-[color:var(--text-muted)]">
                      {reg.company}
                      {reg.role ? ` · ${playerRoleLabel(reg.role)}` : ""} · {reg.email}
                      {` · Pay ${paymentStatusLabel(getPaymentStatus(reg))}`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={reg.auctionStatus || "not_listed"} />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-xs text-[color:var(--text-muted)]">
                  Auction status
                  <select
                    className="input-dark mt-1"
                    value={d.auctionStatus || "not_listed"}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [reg._id]: { ...prev[reg._id], auctionStatus: e.target.value },
                      }))
                    }
                  >
                    <option value="not_listed">Not listed</option>
                    <option value="unsold">Unsold</option>
                    <option value="sold">Sold</option>
                  </select>
                </label>
                <label className="block text-xs text-[color:var(--text-muted)]">
                  Franchise
                  <select
                    className="input-dark mt-1"
                    value={d.franchiseId || ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [reg._id]: { ...prev[reg._id], franchiseId: e.target.value },
                      }))
                    }
                  >
                    <option value="">Select team</option>
                    {franchises.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-[color:var(--text-muted)]">
                  Base price (₹)
                  <input
                    type="number"
                    min="0"
                    className="input-dark mt-1"
                    value={d.basePrice ?? 0}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [reg._id]: { ...prev[reg._id], basePrice: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
                <label className="block text-xs text-[color:var(--text-muted)]">
                  Sold price (₹)
                  <input
                    type="number"
                    min="0"
                    className="input-dark mt-1"
                    value={d.soldPrice ?? 0}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [reg._id]: { ...prev[reg._id], soldPrice: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={busyId === reg._id}
                onClick={() => saveAuction(reg._id)}
                className="btn-primary mt-3 !py-1.5 !text-xs"
              >
                Save assignment
              </button>
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}

function formatAuditAction(action) {
  const map = {
    "registration.approved": "Accepted player",
    "registration.rejected": "Rejected player",
    "registration.pending": "Moved player to pending",
    "registration.auction_update": "Auction assignment",
    "registration.payment_details": "Payment details updated",
    "registration.payment_marked_paid": "Payment marked as paid",
    "registration.pay_now_enabled": "Pay now enabled",
    "user.approved": "Accepted account",
    "user.rejected": "Rejected account",
    "user.pending": "Moved account to pending",
    "user.password_reset": "Reset player password",
  };
  return map[action] || action;
}

function PlayerIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19.5c1.2-3.2 3.7-4.8 7-4.8s5.8 1.6 7 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [popupTeam, setPopupTeam] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api("/api/admin/teams")
      .then((data) => {
        const list = data.teams || [];
        const merged = franchiseCatalog.map((f) => {
          const row = list.find((t) => t.id === f.id) || {};
          return {
            ...f,
            ...row,
            image: f.image,
            accent: f.accent,
            shortName: f.shortName,
            city: f.city,
            playerCount: row.playerCount ?? row.players?.length ?? 0,
            players: row.players || [],
          };
        });
        setTeams(merged);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!popupTeam) return undefined;
    function onKey(e) {
      if (e.key === "Escape") setPopupTeam(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [popupTeam]);

  return (
    <AdminShell
      title="Teams"
      subtitle="Click the player icon on a team to view assigned players."
    >
      {error && <p className="mb-3 text-sm text-accent">{error}</p>}
      {loading && (
        <p className="mb-3 text-sm text-[color:var(--text-muted)]">Loading teams...</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {teams.map((team) => (
          <article
            key={team.id}
            className="rounded-lg border border-[color:var(--border)] bg-ink-card"
          >
            <div
              className="flex items-center justify-between gap-2 px-3 py-3"
              style={{ boxShadow: `inset 3px 0 0 ${team.accent}` }}
            >
              <div className="min-w-0">
                <p className="font-display text-base text-[color:var(--title)]">{team.name}</p>
                <p className="text-[11px] text-[color:var(--text-muted)]">{team.city}</p>
              </div>
              <button
                type="button"
                title={`View ${team.playerCount} players`}
                aria-label={`View players for ${team.name}`}
                onClick={() => setPopupTeam(team)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-accent hover:bg-accent hover:text-white"
              >
                <PlayerIcon />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {team.playerCount}
                </span>
              </button>
            </div>
          </article>
        ))}
      </div>

      {popupTeam && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
          onClick={() => setPopupTeam(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-players-title"
            className="modal-sheet max-h-[85vh] w-full overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-ink-card shadow-2xl sm:max-w-lg sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
              <div>
                <h2
                  id="team-players-title"
                  className="font-display text-lg text-[color:var(--title)]"
                >
                  {popupTeam.name}
                </h2>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {popupTeam.playerCount} assigned player
                  {popupTeam.playerCount === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPopupTeam(null)}
                className="btn-ghost !py-1.5 !text-xs"
              >
                Close
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {(popupTeam.players?.length || 0) === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">
                  No players assigned yet. Use Auction desk and set status to Sold.
                </p>
              ) : (
                <div className="space-y-2">
                  {popupTeam.players.map((p) => (
                    <article
                      key={p._id}
                      className="flex items-center gap-3 rounded-md border border-[color:var(--border)] px-3 py-2.5"
                    >
                      {profileImageUrl(p) ? (
                        <ZoomableImage
                          src={profileImageUrl(p)}
                          alt={p.fullName}
                          className="h-9 w-9 shrink-0 rounded-full border border-[color:var(--border)] object-cover bg-ink-soft"
                        />
                      ) : (
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                          <PlayerIcon size={16} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[color:var(--title)]">{p.fullName}</p>
                        <p className="truncate text-xs text-[color:var(--text-muted)]">
                          {playerRoleLabel(p.role)}
                          {p.company ? ` · ${p.company}` : ""}
                          {` · Pay ${paymentStatusLabel(getPaymentStatus(p))}`}
                          {p.email ? ` · ${p.email}` : ""}
                        </p>
                      </div>
                      {p.soldPrice ? (
                        <p className="text-xs font-semibold text-accent">₹{p.soldPrice}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/admin/audit-logs?limit=150")
      .then((data) => setLogs(data.logs || []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AdminShell
      title="Audit log"
      subtitle="History of admin actions. Duplicate saves with no changes are not logged."
    >
      {error && <p className="mb-3 text-sm text-accent">{error}</p>}
      <div className="space-y-2">
        {logs.length === 0 && (
          <p className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4 text-sm text-[color:var(--text-muted)]">
            No admin actions logged yet.
          </p>
        )}
        {logs.map((log) => (
          <article key={log._id} className="rounded-lg border border-[color:var(--border)] bg-ink-card px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[color:var(--title)]">{formatAuditAction(log.action)}</p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  By {log.adminName || log.adminEmail} · Player/user:{" "}
                  {log.targetLabel || log.targetType}
                </p>
                {log.details?.summary && (
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">{log.details.summary}</p>
                )}
                {!log.details?.summary && log.details?.to && typeof log.details.to === "string" && (
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    Status → {log.details.to}
                    {log.details.adminNotes ? ` · Note: ${log.details.adminNotes}` : ""}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-[color:var(--text-muted)]">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}

function SiteSettingsPage() {
  const { refresh } = useSiteSettings();
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [moduleVisibility, setModuleVisibility] = useState({ ...DEFAULT_MODULE_VISIBILITY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setLoading(true);
    api("/api/admin/settings")
      .then((data) => {
        setRegistrationEnabled(data.settings?.registrationEnabled !== false);
        setModuleVisibility(normalizeModuleVisibility(data.settings?.moduleVisibility));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleModule(key) {
    setModuleVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function onSave(e) {
    e.preventDefault();
    setError("");
    setOk("");
    setSaving(true);
    try {
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ registrationEnabled, moduleVisibility }),
      });
      setRegistrationEnabled(data.settings?.registrationEnabled !== false);
      setModuleVisibility(normalizeModuleVisibility(data.settings?.moduleVisibility));
      await refresh();
      setOk("Settings saved. Module show/hide updates apply site-wide immediately.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Settings"
      subtitle="Control public site options. Changes apply immediately after save."
    >
      {loading ? (
        <PageLoader message="Loading settings…" />
      ) : (
        <form onSubmit={onSave} className="max-w-2xl space-y-5">
          <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <p className="eyebrow text-accent">Registration</p>
              <h2 className="font-display mt-1 text-xl text-[color:var(--title)]">
                Registration mode
              </h2>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                When the Register module is visible, choose whether players see the form or the
                coming-soon page.
              </p>
            </div>
            <div className="space-y-3 p-5">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[color:var(--border)] px-4 py-3 hover:border-accent/40">
                <input
                  type="radio"
                  name="registrationEnabled"
                  className="mt-1"
                  checked={registrationEnabled === true}
                  onChange={() => setRegistrationEnabled(true)}
                />
                <span>
                  <span className="block font-medium text-[color:var(--title)]">Registration open</span>
                  <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                    Button says Register and the full form is available.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[color:var(--border)] px-4 py-3 hover:border-accent/40">
                <input
                  type="radio"
                  name="registrationEnabled"
                  className="mt-1"
                  checked={registrationEnabled === false}
                  onChange={() => setRegistrationEnabled(false)}
                />
                <span>
                  <span className="block font-medium text-[color:var(--title)]">
                    Coming soon (hide form)
                  </span>
                  <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                    Button says “Registration” and opens the coming-soon page instead of the form.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <p className="eyebrow text-accent">Modules</p>
              <h2 className="font-display mt-1 text-xl text-[color:var(--title)]">
                Show / hide module buttons
              </h2>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Toggle each module on or off. Hidden modules disappear from header, footer, and
                related buttons (including Media). Stored in the database.
              </p>
            </div>
            <div className="divide-y divide-[color:var(--border)]">
              {SITE_MODULES.map((mod) => {
                const on = moduleVisibility[mod.key] !== false;
                return (
                  <label
                    key={mod.key}
                    className="flex cursor-pointer items-center justify-between gap-4 px-5 py-3.5 hover:bg-ink-soft/50"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-[color:var(--title)]">{mod.label}</span>
                      <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                        {mod.hint}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wide ${
                          on ? "text-emerald-400" : "text-[color:var(--text-muted)]"
                        }`}
                      >
                        {on ? "Show" : "Hide"}
                      </span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--accent)]"
                        checked={on}
                        onChange={() => toggleModule(mod.key)}
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save settings"}
            </button>
            {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
            {ok ? <AlertBanner tone="ok">{ok}</AlertBanner> : null}
          </div>
        </form>
      )}
    </AdminShell>
  );
}

function RegistrationFeesPage() {
  const FEE_TYPES = [
    { key: "captain", label: "Captain", hint: "Team captain registration" },
    { key: "player", label: "Player", hint: "Batsman, bowler, all-rounder, wicketkeeper" },
    { key: "franchise", label: "Franchise", hint: "Franchise owner registration" },
    { key: "sponsor", label: "Sponsor", hint: "Sponsor registration" },
  ];
  const [fees, setFees] = useState({
    captain: 999,
    player: 999,
    franchise: 999,
    sponsor: 999,
  });
  const [paymentGateway, setPaymentGateway] = useState("razorpay");
  const [gatewayStatus, setGatewayStatus] = useState({
    razorpay: { configured: false },
    cashfree: { configured: false, mode: "sandbox" },
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api("/api/admin/settings")
      .then((data) => {
        const incoming = data.settings?.registrationFees || {};
        setFees((prev) => ({
          captain: incoming.captain ?? prev.captain,
          player: incoming.player ?? prev.player,
          franchise: incoming.franchise ?? prev.franchise,
          sponsor: incoming.sponsor ?? prev.sponsor,
        }));
        setPaymentGateway(data.settings?.paymentGateway || "razorpay");
        setGatewayStatus(
          data.settings?.paymentGatewayStatus || {
            razorpay: { configured: false },
            cashfree: { configured: false, mode: "sandbox" },
          }
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateFee(key, value) {
    setFees((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave(e) {
    e.preventDefault();
    setError("");
    setOk("");
    setSaving(true);
    try {
      const registrationFees = {};
      for (const { key } of FEE_TYPES) {
        const amount = Math.round(Number(fees[key]));
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("Each fee must be a positive amount in INR.");
        }
        registrationFees[key] = amount;
      }
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ registrationFees, paymentGateway }),
      });
      setFees(data.settings.registrationFees);
      setPaymentGateway(data.settings.paymentGateway || paymentGateway);
      setGatewayStatus(
        data.settings.paymentGatewayStatus || {
          razorpay: { configured: false },
          cashfree: { configured: false, mode: "sandbox" },
        }
      );
      setOk("Payment settings saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Registration fees"
      subtitle="Set registration amounts and choose Razorpay or Cashfree for online payments."
    >
      {loading ? (
        <PageLoader message="Loading fees…" />
      ) : (
        <form onSubmit={onSave} className="max-w-2xl space-y-5">
          <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <p className="eyebrow text-accent">Payment gateway</p>
              <h2 className="font-display mt-1 text-xl text-[color:var(--title)]">Online checkout</h2>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Keys stay in server `.env`. This setting controls which gateway the register page uses.
              </p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {[
                { value: "razorpay", label: "Razorpay" },
                { value: "cashfree", label: "Cashfree" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
                    paymentGateway === option.value
                      ? "border-accent bg-accent/10"
                      : "border-[color:var(--border)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentGateway"
                    value={option.value}
                    checked={paymentGateway === option.value}
                    onChange={() => setPaymentGateway(option.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium text-[color:var(--title)]">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                      {gatewayStatus[option.value]?.configured
                        ? "Configured"
                        : "Keys missing in server .env"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <p className="eyebrow text-accent">Payment</p>
              <h2 className="font-display mt-1 text-xl text-[color:var(--title)]">Fee by registration type</h2>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Shown on the register page and used when creating payment orders.
              </p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {FEE_TYPES.map(({ key, label, hint }) => (
                <label key={key} className="block text-sm">
                  <span className="font-medium text-[color:var(--title)]">{label}</span>
                  <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">{hint}</span>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--text-muted)]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      className="input-dark !pl-7"
                      value={fees[key]}
                      onChange={(e) => updateFee(key, e.target.value)}
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save payment settings"}
            </button>
            {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
            {ok ? <AlertBanner tone="ok">{ok}</AlertBanner> : null}
          </div>
        </form>
      )}
    </AdminShell>
  );
}

function PortalMediaPage() {
  return <PortalMediaManager AdminShell={AdminShell} />;
}

function SponsorPackagesPage() {
  return <SponsorPackagesAdmin AdminShell={AdminShell} />;
}

function SocialMediaPage() {
  const { refresh } = useSiteSettings();
  const [contact, setContact] = useState({
    email: "",
    phone: "",
    address: "",
  });
  const [socials, setSocials] = useState([
    { label: "Facebook", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "YouTube", href: "#" },
    { label: "Twitter (X)", href: "#" },
  ]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const PLATFORM_ORDER = ["Facebook", "Instagram", "LinkedIn", "YouTube", "Twitter (X)"];

  useEffect(() => {
    setLoading(true);
    api("/api/admin/settings")
      .then((data) => {
        setContact(data.settings?.contact || { email: "", phone: "", address: "" });
        const incoming = data.settings?.socials || [];
        const byLabel = Object.fromEntries(incoming.map((s) => [s.label, s.href || "#"]));
        setSocials(
          PLATFORM_ORDER.map((label) => ({
            label,
            href: byLabel[label] || "#",
          }))
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateHref(label, href) {
    setSocials((prev) => prev.map((s) => (s.label === label ? { ...s, href } : s)));
  }

  async function onSave(e) {
    e.preventDefault();
    setError("");
    setOk("");
    setSaving(true);
    try {
      const payload = {
        contact,
        socials: socials.map((s) => ({ label: s.label, href: s.href || "#", iconUrl: "" })),
      };
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setContact(data.settings.contact);
      const byLabel = Object.fromEntries((data.settings.socials || []).map((s) => [s.label, s.href || "#"]));
      setSocials(PLATFORM_ORDER.map((label) => ({ label, href: byLabel[label] || "#" })));
      await refresh();
      setOk("Published to the website.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Social media"
      subtitle="Edit contact details and social profile links shown on the public site."
    >
      {loading ? (
        <p className="text-sm text-[color:var(--text-muted)]">Loading settings...</p>
      ) : (
        <form onSubmit={onSave} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
              <div className="border-b border-[color:var(--border)] px-5 py-4">
                <p className="eyebrow text-accent">Contact</p>
                <h2 className="font-display mt-1 text-xl text-[color:var(--title)]">Public contact details</h2>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-[color:var(--text)]">Email</span>
                  <input
                    type="email"
                    className="input-dark mt-1.5"
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                    placeholder="info@usclt20.com"
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-[color:var(--text)]">Phone</span>
                  <input
                    className="input-dark mt-1.5"
                    value={contact.phone}
                    onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="+91 99999 99999"
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-[color:var(--text)]">Address</span>
                  <input
                    className="input-dark mt-1.5"
                    value={contact.address}
                    onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))}
                    placeholder="Hyderabad, India"
                    required
                  />
                </label>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
              <div className="border-b border-[color:var(--border)] px-5 py-4">
                <p className="eyebrow text-accent">Social Media</p>
                <h2 className="font-display mt-1 text-xl text-[color:var(--title)]">Profile links</h2>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Paste full profile URLs. Leave as # if not ready yet.
                </p>
              </div>
              <div className="divide-y divide-[color:var(--border)]">
                {socials.map((s) => (
                  <label key={s.label} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center">
                    <span className="w-32 shrink-0 text-sm font-semibold text-[color:var(--title)]">
                      {s.label}
                    </span>
                    <input
                      className="input-dark"
                      value={s.href}
                      onChange={(e) => updateHref(s.label, e.target.value)}
                      placeholder={`https://... ${s.label.toLowerCase()} ...`}
                    />
                  </label>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving..." : "Save & publish"}
              </button>
              {error && <p className="text-sm text-accent">{error}</p>}
              {ok && <p className="text-sm text-emerald-500">{ok}</p>}
            </div>
          </div>

          <aside className="h-fit rounded-xl border border-[color:var(--border)] bg-ink-soft p-5 lg:sticky lg:top-20">
            <p className="eyebrow text-accent">Live preview</p>
            <h3 className="font-display mt-1 text-lg text-[color:var(--title)]">How it appears</h3>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                  Contact
                </p>
                <div className="mt-2 space-y-1.5 text-[color:var(--text)]">
                  <p>{contact.email || "—"}</p>
                  <p>{contact.phone || "—"}</p>
                  <p>{contact.address || "—"}</p>
                </div>
              </div>

              <div className="border-t border-[color:var(--border)] pt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                  Social Media
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {socials.map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between gap-2 rounded-md border border-[color:var(--border)] bg-ink px-3 py-2"
                    >
                      <span className="font-medium text-[color:var(--title)]">{s.label}</span>
                      <span className="truncate text-xs text-[color:var(--text-muted)]">
                        {s.href && s.href !== "#" ? s.href : "Not set"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </form>
      )}
    </AdminShell>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/admin/login", { replace: true });
    else if (user.role !== "admin") navigate("/admin/login", { replace: true });
  }, [loading, user, navigate]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-[color:var(--text-muted)]">
        Opening admin portal...
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<OverviewPage />} />
      <Route path="players/:status" element={<PlayersPage />} />
      <Route path="teams" element={<TeamsPage />} />
      <Route path="passwords" element={<PasswordsPage />} />
      <Route path="auction" element={<AuctionPage />} />
      <Route path="live" element={<AdminLivePage AdminShell={AdminShell} />} />
      <Route path="settings" element={<SiteSettingsPage />} />
      <Route path="fees" element={<RegistrationFeesPage />} />
      <Route path="sponsors" element={<SponsorPackagesPage />} />
      <Route path="media" element={<PortalMediaPage />} />
      <Route path="social" element={<SocialMediaPage />} />
      <Route path="audit" element={<AuditPage />} />
      <Route path="players" element={<Navigate to="/admin/players/pending" replace />} />
      <Route path="accounts/*" element={<Navigate to="/admin/players/pending" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
