import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    adminEmail: { type: String, required: true },
    adminName: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true, index: true },
    targetId: { type: String, default: "" },
    targetLabel: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
