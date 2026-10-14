import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "uscl-dev-secret";

export function getPublicApiBase(req) {
  const fromEnv = String(
    process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || process.env.API_PUBLIC_URL || ""
  )
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (req) {
    const proto = String(req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0].trim();
    const host = String(req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
    if (host && !host.includes("usclt20.com") && !host.includes("vercel.app")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
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
