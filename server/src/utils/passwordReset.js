import { createHash, randomBytes } from "crypto";
import { isMailConfigured, sendPasswordResetEmail } from "./mail.js";

export function hashResetToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export function buildPasswordResetUrl(user, rawToken) {
  const clientUrl = String(
    process.env.CLIENT_URL ||
      (process.env.NODE_ENV === "production" ? "https://www.usclt20.com" : "http://localhost:5173")
  ).replace(/\/$/, "");
  const email = String(user?.email || "").trim().toLowerCase();
  return `${clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
}

/** Store hashed token on user and return the full reset URL (token in query is the secret). */
export async function issuePasswordResetLink(user) {
  const rawToken = randomBytes(32).toString("hex");
  user.resetPasswordTokenHash = hashResetToken(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  return buildPasswordResetUrl(user, rawToken);
}

export async function sendUserPasswordResetEmail(user) {
  const resetLink = await issuePasswordResetLink(user);
  if (!isMailConfigured()) {
    return { sent: false, resetLink };
  }
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetLink,
  });
  return { sent: true };
}
