import { AuditLog } from "../models/AuditLog.js";

export async function writeAudit(req, { action, targetType, targetId, targetLabel, details }) {
  try {
    await AuditLog.create({
      adminId: req.user.userId,
      adminEmail: req.user.email || "",
      adminName: req.user.name || "",
      action,
      targetType,
      targetId: targetId ? String(targetId) : "",
      targetLabel: targetLabel || "",
      details: details || {},
    });
  } catch (error) {
    console.error("audit log error", error);
  }
}
