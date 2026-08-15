import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, type UserRole } from "@/models/User";

const COOKIE_NAME = "uscl_session";

function getSecret() {
  const secret = process.env.JWT_SECRET || "uscl-dev-secret-change-me-in-production";
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const data = payload as unknown as SessionPayload;
    return {
      ...data,
      role: data.role === "admin" ? "admin" : "user",
    } satisfies SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Please sign in first.", status: 401 as const };
  }
  if (session.role !== "admin") {
    return { ok: false as const, error: "Admin access required.", status: 403 as const };
  }
  return { ok: true as const, session };
}

/** Creates/updates the default admin account from env (or built-in defaults). */
export async function ensureAdminUser() {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || "admin@uscl.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  const name = process.env.ADMIN_NAME || "USCL Admin";

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
    }
    return existing;
  }

  const passwordHash = await hashPassword(password);
  return User.create({
    name,
    email,
    phone: "",
    passwordHash,
    role: "admin",
  });
}
