import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "uscl-dev-secret";

const PRODUCTION_API_FALLBACK = "https://uscl-website.onrender.com";

export function getPublicApiBase(_req) {
  const fromEnv = String(
    process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || process.env.API_PUBLIC_URL || ""
  )
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_API_FALLBACK;
  }
  return "http://localhost:5000";
}

export function signDocumentUploadToken({ user, registrationId, admin = false }) {
  return jwt.sign(
    {
      purpose: "document_upload",
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role === "admin" ? "admin" : "user",
      registrationId: String(registrationId),
      admin: Boolean(admin),
    },
    JWT_SECRET,
    { expiresIn: "20m" }
  );
}

export function verifyDocumentUploadToken(token, registrationId, { requireAdmin = false } = {}) {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.purpose !== "document_upload") {
    throw new Error("Invalid upload token.");
  }
  if (String(payload.registrationId) !== String(registrationId)) {
    throw new Error("Upload token does not match this registration.");
  }
  if (requireAdmin && payload.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
}
