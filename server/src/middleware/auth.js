import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

const COOKIE_NAME = "uscl_session";
const ADMIN_COOKIE_NAME = "uscl_admin_session";

function authCookieOptions() {
  // Cross-site (Vercel frontend → Render API) requires SameSite=None + Secure.
  const sameSiteRaw = String(process.env.COOKIE_SAME_SITE || "").trim().toLowerCase();
  const sameSite =
    sameSiteRaw === "lax" || sameSiteRaw === "strict" || sameSiteRaw === "none"
      ? sameSiteRaw
      : process.env.NODE_ENV === "production"
        ? "none"
        : "lax";

  return {
    httpOnly: true,
    sameSite,
    secure: sameSite === "none" ? true : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function isAdminPortal(req) {
  const header = String(req.headers["x-uscl-portal"] || "").toLowerCase();
  const url = String(req.originalUrl || req.url || "");
  return header === "admin" || url.startsWith("/api/admin") || url.startsWith("/api/auth/admin");
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || "uscl-dev-secret", {
    expiresIn: "7d",
  });
}

export function setAuthCookie(res, token, { admin = false } = {}) {
  res.cookie(admin ? ADMIN_COOKIE_NAME : COOKIE_NAME, token, authCookieOptions());
}

export function clearAuthCookie(res, { admin = false, both = false } = {}) {
  const opts = { path: "/", ...authCookieOptions(), maxAge: 0 };
  if (both || !admin) res.clearCookie(COOKIE_NAME, opts);
  if (both || admin) res.clearCookie(ADMIN_COOKIE_NAME, opts);
}

export function getTokenFromReq(req) {
  if (isAdminPortal(req)) {
    return req.cookies?.[ADMIN_COOKIE_NAME] || req.cookies?.[COOKIE_NAME] || null;
  }
  return req.cookies?.[COOKIE_NAME] || null;
}

export function authRequired(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: "Please sign in first." });
    const payload = jwt.verify(token, process.env.JWT_SECRET || "uscl-dev-secret");
    req.user = {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role === "admin" ? "admin" : "user",
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

export function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    next();
  });
}

export async function approvedRequired(req, res, next) {
  // Account signup is open; admin only reviews player registrations
  return authRequired(req, res, next);
}

export async function ensureAdminUser() {
  // One approval gate only: player registration (not separate account pending)
  await User.updateMany(
    { role: { $ne: "admin" }, status: { $in: ["pending", null] } },
    { $set: { status: "approved" } }
  );
  await User.updateMany(
    { $or: [{ status: { $exists: false } }, { status: null }] },
    { $set: { status: "approved" } }
  );

  const email = (process.env.ADMIN_EMAIL || "admin@uscl.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  const name = process.env.ADMIN_NAME || "USCL Admin";

  const existing = await User.findOne({ email });
  if (existing) {
    let dirty = false;
    if (existing.role !== "admin") {
      existing.role = "admin";
      dirty = true;
    }
    if (existing.status !== "approved") {
      existing.status = "approved";
      dirty = true;
    }
    if (dirty) await existing.save();
    return existing;
  }

  const passwordHash = await hashPassword(password);
  return User.create({
    name,
    email,
    phone: "",
    passwordHash,
    role: "admin",
    status: "approved",
  });
}
