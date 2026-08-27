import nodemailer from "nodemailer";

const DEFAULT_FROM = "USCL <notifications@usclt20.com>";
const HOSTINGER_SMTP_HOST = "smtp.hostinger.com";
const HOSTINGER_SMTP_USER = "notifications@usclt20.com";

function smtpHost() {
  return String(process.env.SMTP_HOST || HOSTINGER_SMTP_HOST).trim() || HOSTINGER_SMTP_HOST;
}

function smtpUser() {
  return String(process.env.SMTP_USER || HOSTINGER_SMTP_USER).trim() || HOSTINGER_SMTP_USER;
}

function smtpPass() {
  return String(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").trim();
}

function smtpPort() {
  const port = Number(process.env.SMTP_PORT || 465);
  return Number.isFinite(port) && port > 0 ? port : 465;
}

export function isMailConfigured() {
  return Boolean(smtpPass());
}

function mailFrom() {
  const raw = String(process.env.MAIL_FROM || process.env.SMTP_FROM || "").trim();
  if (raw) {
    return raw.includes("<") ? raw : `USCL Notifications <${raw}>`;
  }
  return DEFAULT_FROM;
}

function getTransporter() {
  const port = smtpPort();
  const secure = port === 465;
  return nodemailer.createTransport({
    host: smtpHost(),
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: {
      user: smtpUser(),
      pass: smtpPass(),
    },
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapHtml({ title, bodyHtml }) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#161616;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:#1c1c1c;border-bottom:1px solid #2a2a2a;">
                <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#ff6a4d;">USCL 2026</p>
                <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;color:#ffffff;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;font-size:15px;line-height:1.55;color:#d8d8d8;">
                ${bodyHtml}
                <p style="margin:28px 0 0;font-size:12px;color:#888888;">
                  US Staffing Champions League<br />
                  This is an automated message from notifications@usclt20.com
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendMail({ to, subject, text, html }) {
  if (!to) return { skipped: true, reason: "missing-to" };
  if (!isMailConfigured()) {
    console.warn(`[mail] SMTP is not configured; skipped "${subject}" to ${to}`);
    return { skipped: true, reason: "not-configured" };
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: mailFrom(),
    to,
    subject,
    text,
    html,
  });
  return { sent: true };
}

export function sendMailInBackground(options) {
  sendMail(options).catch((error) => {
    console.error(`[mail] failed to send "${options.subject}" to ${options.to}`, error);
  });
}

const INTEREST_LABELS = {
  player: "Player",
  captain: "Captain",
  franchise: "Franchise",
  sponsor: "Sponsor",
};

export function sendRegistrationReceivedEmail({
  to,
  fullName,
  interest,
  role,
  company,
  paymentStatus,
  feeInr,
}) {
  const name = fullName || "Player";
  const interestLabel = INTEREST_LABELS[interest] || interest || "Player";
  const paymentLabel = paymentStatus === "paid" ? "Paid" : paymentStatus || "Pending";
  const siteUrl = process.env.CLIENT_URL || "https://www.usclt20.com";

  const subject = `USCL 2026 — ${interestLabel} registration received`;
  const text = [
    `Hi ${name},`,
    "",
    `Thank you for registering for the US Staffing Champions League 2026 as a ${interestLabel}.`,
    "",
    `Company: ${company || "—"}`,
    role ? `Role: ${role}` : null,
    `Payment: ${paymentLabel}${feeInr ? ` (₹${feeInr})` : ""}`,
    "",
    "Our team will review your registration. You can check status anytime from your dashboard.",
    siteUrl,
    "",
    "— USCL",
  ]
    .filter(Boolean)
    .join("\n");

  const html = wrapHtml({
    title: "Registration received",
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 16px;">Thank you for registering for the <strong style="color:#ffffff;">US Staffing Champions League 2026</strong> as a <strong style="color:#ffffff;">${escapeHtml(interestLabel)}</strong>.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#111111;border-radius:8px;">
        <tr><td style="padding:14px 16px;font-size:14px;color:#cfcfcf;">
          <p style="margin:0 0 6px;"><strong style="color:#ffffff;">Company:</strong> ${escapeHtml(company || "—")}</p>
          ${role ? `<p style="margin:0 0 6px;"><strong style="color:#ffffff;">Role:</strong> ${escapeHtml(role)}</p>` : ""}
          <p style="margin:0;"><strong style="color:#ffffff;">Payment:</strong> ${escapeHtml(paymentLabel)}${feeInr ? ` (₹${feeInr})` : ""}</p>
        </td></tr>
      </table>
      <p style="margin:0 0 18px;">Our team will review your details. You can check your status anytime from your dashboard.</p>
      <p style="margin:0;">
        <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#ff3d2e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:bold;">Open USCL</a>
      </p>
    `,
  });

  sendMailInBackground({ to, subject, text, html });
}

function dashboardUrl() {
  const siteUrl = String(process.env.CLIENT_URL || "https://www.usclt20.com").replace(/\/$/, "");
  return `${siteUrl}/dashboard`;
}

export function sendRegistrationConfirmedEmail({
  to,
  fullName,
  interest,
  franchiseName,
  adminNotes,
}) {
  const name = fullName || "Player";
  const interestLabel = INTEREST_LABELS[interest] || interest || "Player";
  const dashUrl = dashboardUrl();

  const subject = `USCL 2026 — Your ${interestLabel} registration is confirmed`;
  const text = [
    `Hi ${name},`,
    "",
    `Great news — your USCL 2026 ${interestLabel} registration has been confirmed by our team.`,
    franchiseName ? `Franchise team: ${franchiseName}` : null,
    adminNotes ? `Note from admin: ${adminNotes}` : null,
    "",
    "You can view your registration status anytime from your dashboard.",
    dashUrl,
    "",
    "— USCL",
  ]
    .filter(Boolean)
    .join("\n");

  const html = wrapHtml({
    title: "Registration confirmed",
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 16px;">Your <strong style="color:#ffffff;">${escapeHtml(interestLabel)}</strong> registration for USCL 2026 has been <strong style="color:#ffffff;">confirmed</strong>.</p>
      ${franchiseName ? `<p style="margin:0 0 16px;"><strong style="color:#ffffff;">Team:</strong> ${escapeHtml(franchiseName)}</p>` : ""}
      ${adminNotes ? `<p style="margin:0 0 16px;"><strong style="color:#ffffff;">Admin note:</strong> ${escapeHtml(adminNotes)}</p>` : ""}
      <p style="margin:0 0 18px;">You can view your registration status anytime from your dashboard.</p>
      <p style="margin:0;">
        <a href="${escapeHtml(dashUrl)}" style="display:inline-block;background:#ff3d2e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:bold;">Open dashboard</a>
      </p>
    `,
  });

  sendMailInBackground({ to, subject, text, html });
}

export function sendRegistrationRejectedEmail({ to, fullName, interest, adminNotes }) {
  const name = fullName || "Player";
  const interestLabel = INTEREST_LABELS[interest] || interest || "Player";

  const subject = `USCL 2026 — Update on your ${interestLabel} registration`;
  const text = [
    `Hi ${name},`,
    "",
    `Thank you for your interest in the US Staffing Champions League 2026.`,
    `After review, we are unable to confirm your ${interestLabel} registration at this time.`,
    adminNotes ? `Note from admin: ${adminNotes}` : null,
    "",
    "If you have questions, reply to this email or contact us through the website.",
    "",
    "— USCL",
  ]
    .filter(Boolean)
    .join("\n");

  const html = wrapHtml({
    title: "Registration update",
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 16px;">Thank you for your interest in the <strong style="color:#ffffff;">US Staffing Champions League 2026</strong>.</p>
      <p style="margin:0 0 16px;">After review, we are unable to confirm your <strong style="color:#ffffff;">${escapeHtml(interestLabel)}</strong> registration at this time.</p>
      ${adminNotes ? `<p style="margin:0 0 16px;"><strong style="color:#ffffff;">Admin note:</strong> ${escapeHtml(adminNotes)}</p>` : ""}
      <p style="margin:0;">If you have questions, reply to this email or contact us through the website.</p>
    `,
  });

  sendMailInBackground({ to, subject, text, html });
}

export function sendPasswordResetEmail({ to, name, resetLink }) {
  const subject = "USCL — Reset your password";
  const text = [
    `Hi ${name || "Player"},`,
    "",
    "We received a request to reset your USCL password.",
    "Open this link within 1 hour to set a new password:",
    resetLink,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "— USCL",
  ].join("\n");

  const html = wrapHtml({
    title: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi ${escapeHtml(name || "Player")},</p>
      <p style="margin:0 0 16px;">We received a request to reset your USCL password. This link expires in 1 hour.</p>
      <p style="margin:0 0 18px;">
        <a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#ff3d2e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:bold;">Reset password</a>
      </p>
      <p style="margin:0;font-size:13px;color:#888888;">If you did not request this, you can ignore this email.</p>
    `,
  });

  return sendMail({ to, subject, text, html });
}
