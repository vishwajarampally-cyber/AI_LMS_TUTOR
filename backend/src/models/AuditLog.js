import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entity: String,
    entityId: String,
    ip: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
