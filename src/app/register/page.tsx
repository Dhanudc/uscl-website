"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/components/AuthProvider";

const journey = [
  "Register",
  "Verification",
  "Physical Check",
  "Live Auction",
  "Franchise Pick",
  "Tournament",
];

const requirements = [
  "Valid Government Photo ID",
  "Company ID Card or Offer Letter",
  "Employment Proof (Payslip / HR Letter)",
  "Min. 1 year experience as of 31 Aug 2026",
  "Passport photo + signed Code of Conduct",
  "Fee non-refundable after verification",
];

type SavedRegistration = {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  experienceYears: number;
  city?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  interest: string;
  status: string;
};

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<SavedRegistration | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/register");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoadingExisting(true);
    fetch("/api/registrations", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return;
        const list = (data.registrations || []) as SavedRegistration[];
        const latest = list[0] || null;
        setExisting(latest);
        if (latest) setSuccess(true);
      })
      .finally(() => setLoadingExisting(false));
  }, [user]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          phone: form.get("phone"),
          company: form.get("company"),
          role: form.get("role"),
          experienceYears: Number(form.get("experienceYears")),
          city: form.get("city"),
          battingStyle: form.get("battingStyle"),
          bowlingStyle: form.get("bowlingStyle"),
          interest: form.get("interest"),
          agreedToTerms: form.get("agreedToTerms") === "on",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed");
        return;
      }
      setExisting(data.registration);
      setSuccess(true);
    } catch {
      setError("Unable to submit registration.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || loadingExisting) {
    return (
      <section className="px-4 py-20 text-center text-sm text-white/50">
        Loading your details...
      </section>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Player Registration 2026"
        title="Register. Get auctioned. Play."
        subtitle="Your account details stay saved. Submit once and track status from the dashboard."
      />

      <section className="bg-ink px-4 py-12 md:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-xl text-white">Journey</h2>
          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-6">
            {journey.map((step, i) => (
              <div key={step} className="panel rounded-xl px-3 py-3">
                <p className="text-[10px] tracking-[0.16em] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-1.5 text-[12px] font-medium text-white">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-ink-soft px-4 py-12 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-xl text-white">Eligibility</h2>
            <ul className="mt-4 space-y-2 text-[13px] text-white/55">
              {requirements.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-white">Tournament form</h2>
            {success && existing ? (
              <div className="panel mt-4 space-y-3 rounded-2xl p-5">
                <p className="font-display text-2xl text-white">Details saved</p>
                <p className="text-sm text-white/55">
                  Status:{" "}
                  <strong className="uppercase text-accent">{existing.status}</strong>
                </p>
                <div className="grid gap-2 rounded-xl bg-black/25 p-4 text-sm text-white/85 sm:grid-cols-2">
                  <p>
                    <span className="text-white/45">Name:</span> {existing.fullName}
                  </p>
                  <p>
                    <span className="text-white/45">Email:</span> {existing.email}
                  </p>
                  <p>
                    <span className="text-white/45">Phone:</span> {existing.phone}
                  </p>
                  <p>
                    <span className="text-white/45">Company:</span> {existing.company}
                  </p>
                  <p>
                    <span className="text-white/45">Role:</span> {existing.role}
                  </p>
                  <p>
                    <span className="text-white/45">Experience:</span> {existing.experienceYears} yrs
                  </p>
                  <p>
                    <span className="text-white/45">City:</span> {existing.city || "—"}
                  </p>
                  <p>
                    <span className="text-white/45">Interest:</span> {existing.interest}
                  </p>
                </div>
                <Link href="/dashboard" className="btn-primary inline-flex">
                  Open Dashboard
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="panel mt-4 space-y-3 rounded-2xl p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full Name" name="fullName" defaultValue={user.name} required />
                  <Field label="Email" name="email" type="email" defaultValue={user.email} required />
                  <Field
                    label="Phone"
                    name="phone"
                    type="tel"
                    defaultValue={user.phone || ""}
                    required
                  />
                  <Field label="Company" name="company" required />
                  <Field label="Role" name="role" required />
                  <Field label="Experience (years)" name="experienceYears" type="number" required />
                  <Field label="City" name="city" />
                  <label className="block text-[12px]">
                    <span className="text-white/55">Interest</span>
                    <select
                      name="interest"
                      className="input-dark mt-1.5 rounded-lg"
                      defaultValue="player"
                    >
                      <option value="player">Player</option>
                      <option value="franchise">Franchise</option>
                      <option value="sponsor">Sponsor</option>
                    </select>
                  </label>
                  <Field label="Batting Style" name="battingStyle" />
                  <Field label="Bowling Style" name="bowlingStyle" />
                </div>
                <label className="flex items-start gap-2 text-[12px] text-white/55">
                  <input type="checkbox" name="agreedToTerms" required className="mt-0.5" />
                  <span>
                    I confirm eligibility and agree the registration fee is non-refundable after
                    verification.
                  </span>
                </label>
                {error && <p className="text-[12px] text-accent">{error}</p>}
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? "Saving..." : "Submit Registration"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-[12px]">
      <span className="text-white/55">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="input-dark mt-1.5 rounded-lg"
      />
    </label>
  );
}
