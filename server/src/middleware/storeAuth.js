import jwt from "jsonwebtoken";
import { StoreCustomer } from "../models/store/StoreCustomer.js";
import { User } from "../models/User.js";
import { verifyPassword, hashPassword, signToken, adminRequired } from "./auth.js";

export const STORE_COOKIE = "uscl_store_session";

function storeCookieOptions() {
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
    maxAge: 14 * 24 * 60 * 60 * 1000,
  };
}

export function setStoreCustomerCookie(res, customerId) {
  const token = signToken({ storeCustomerId: String(customerId), kind: "store" });
  res.cookie(STORE_COOKIE, token, storeCookieOptions());
}

export function clearStoreCustomerCookie(res) {
  res.clearCookie(STORE_COOKIE, { ...storeCookieOptions(), maxAge: 0 });
}

export function storeCustomerRequired(req, res, next) {
  const token = req.cookies?.[STORE_COOKIE];
  if (!token) return res.status(401).json({ error: "Please sign in to the store." });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "uscl-dev-secret");
    if (payload.kind !== "store" || !payload.storeCustomerId) {
      return res.status(401).json({ error: "Invalid store session." });
    }
    req.storeCustomerId = payload.storeCustomerId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired store session." });
  }
}

export async function loadStoreCustomer(req, res, next) {
  try {
    const doc = await StoreCustomer.findById(req.storeCustomerId);
    if (!doc || doc.status !== "active") {
      return res.status(401).json({ error: "Store account not found." });
    }
    req.storeCustomer = doc;
    next();
  } catch {
    return res.status(500).json({ error: "Could not load store account." });
  }
}

export { hashPassword, verifyPassword, adminRequired };

export async function findOrCreateCustomerForPlayer(user) {
  let customer = await StoreCustomer.findOne({ playerUserId: user._id });
  if (customer) return customer;
  customer = await StoreCustomer.findOne({ email: user.email });
  if (customer) {
    if (!customer.playerUserId) {
      customer.playerUserId = user._id;
      await customer.save();
    }
    return customer;
  }
  return StoreCustomer.create({
    name: user.name,
    email: user.email,
    mobile: user.phone || "0000000000",
    passwordHash: null,
    playerUserId: user._id,
  });
}

export async function authenticateStoreLogin({ email, password }) {
  const normalized = String(email || "").trim().toLowerCase();
  const pass = String(password || "");

  const user = await User.findOne({ email: normalized });
  if (user) {
    const ok = await verifyPassword(pass, user.passwordHash);
    if (!ok) return { error: "Invalid email or password." };
    const customer = await findOrCreateCustomerForPlayer(user);
    return { customer, linkedPlayer: true };
  }

  const customer = await StoreCustomer.findOne({ email: normalized });
  if (!customer || !customer.passwordHash) {
    return { error: "Invalid email or password." };
  }
  const ok = await verifyPassword(pass, customer.passwordHash);
  if (!ok) return { error: "Invalid email or password." };
  return { customer, linkedPlayer: false };
}
