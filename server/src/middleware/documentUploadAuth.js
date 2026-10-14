import { adminRequired, approvedRequired } from "./auth.js";
import { verifyDocumentUploadToken } from "../utils/documentUploadToken.js";

export function documentUploadAuth({ requireAdmin = false } = {}) {
  return (req, res, next) => {
    const authHeader = String(req.headers.authorization || "");
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (bearer) {
      try {
        const user = verifyDocumentUploadToken(bearer, req.params.id, { requireAdmin });
        req.user = user;
        return next();
      } catch {
        return res.status(401).json({ error: "Invalid or expired upload token. Please try again." });
      }
    }
    if (requireAdmin) return adminRequired(req, res, next);
    return approvedRequired(req, res, next);
  };
}
