import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const assetSchema = new Schema({
  url: { type: String, required: true, trim: true },
  publicId: { type: String, required: true, trim: true },
  originalName: { type: String, required: true, trim: true },
  resourceType: { type: String, enum: ["image", "raw"], required: true },
}, { _id: false });

function makeAppendOnly(schema, modelName) {
  schema.pre("save", function rejectExistingSave() {
    if (!this.isNew) throw new Error(`${modelName} records are append-only`);
  });
  ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne", "findOneAndReplace", "deleteOne", "deleteMany", "findOneAndDelete"].forEach((operation) => {
    schema.pre(operation, function rejectMutation() {
      throw new Error(`${modelName} records cannot be updated or deleted`);
    });
  });
  schema.pre("deleteOne", { document: true, query: false }, function rejectDelete() {
    throw new Error(`${modelName} records cannot be deleted`);
  });
  schema.pre("bulkWrite", function rejectBulkMutation() {
    throw new Error(`${modelName} records cannot be changed through bulk writes`);
  });
}

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80, alias: "displayName" },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["parent"], required: true, default: "parent" },
  isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const childSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100, alias: "fullName" },
  dob: { type: Date, required: true, alias: "dateOfBirth" },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const familySchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  parents: {
    type: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    required: true,
    validate: {
      validator: (ids) => ids.length >= 1 && ids.length <= 2 && new Set(ids.map(String)).size === ids.length,
      message: "A family must contain one or two distinct parents",
    },
  },
  children: {
    type: [childSchema],
    required: true,
    validate: { validator: (children) => children.length >= 1, message: "A family must contain at least one child" },
  },
  inviteCode: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true, minlength: 6, maxlength: 6 },
  scheduleRevision: { type: Number, required: true, default: 0, select: false },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
familySchema.index({ parents: 1 });

const custodyEventSchema = new Schema({
  familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },
  childId: { type: Schema.Types.ObjectId, required: true, index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  assignedParent: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["regular", "holiday", "swap-request"], required: true, default: "regular" },
  // An enum prevents contradictory combinations that separate flags such as isConfirmed and isDisputed could permit.
  status: { type: String, enum: ["confirmed", "pending-swap", "disputed"], required: true, default: "confirmed", index: true },
  requestedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
    required() { return this.status === "pending-swap"; },
  },
  originalEvent: { type: Schema.Types.ObjectId, ref: "CustodyEvent", default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, required: true, default: Date.now, immutable: true },
}, { optimisticConcurrency: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
custodyEventSchema.pre("validate", function validateDates() {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) this.invalidate("endDate", "endDate must be later than startDate");
  if (this.status !== "pending-swap" && this.requestedBy) this.invalidate("requestedBy", "requestedBy is only valid for pending swap events");
  if (this.type === "swap-request" && !this.originalEvent) this.invalidate("originalEvent", "A swap request must reference its original event");
});
custodyEventSchema.index({ familyId: 1, childId: 1, status: 1, startDate: 1, endDate: 1 });
custodyEventSchema.index({ originalEvent: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "pending-swap" } });
custodyEventSchema.virtual("family").get(function () { return this.familyId; });
custodyEventSchema.virtual("childIds").get(function () { return [this.childId]; });
custodyEventSchema.virtual("startsAt").get(function () { return this.startDate; });
custodyEventSchema.virtual("endsAt").get(function () { return this.endDate; });
custodyEventSchema.virtual("custodialParent").get(function () { return this.assignedParent; });
custodyEventSchema.virtual("title").get(function () {
  if (this.type === "holiday") return "Holiday custody";
  if (this.type === "swap-request") return "Custody swap request";
  return "Regular custody";
});
custodyEventSchema.virtual("notes").get(() => "");
custodyEventSchema.virtual("allDay").get(() => false);
custodyEventSchema.virtual("swapRequest").get(function () {
  if (this.status !== "pending-swap") return undefined;
  return {
    requestedBy: this.requestedBy,
    proposedStartAt: this.startDate,
    proposedEndAt: this.endDate,
    proposedCustodialParent: this.assignedParent,
  };
});

const expenseApprovalSchema = new Schema({
  parentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, enum: ["approve", "dispute"], required: true },
  timestamp: { type: Date, required: true, default: Date.now, immutable: true },
  note: { type: String, trim: true, maxlength: 1000, default: "" },
}, { _id: false });

const splitRatioSchema = new Schema({
  parent1: { type: Number, required: true, min: 0, max: 100, default: 50 },
  parent2: { type: Number, required: true, min: 0, max: 100, default: 50 },
}, { _id: false });

const expenseSchema = new Schema({
  familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },
  childId: { type: Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 2, maxlength: 150 },
  amount: { type: Number, required: true, min: 0.01 },
  paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  proposedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  splitRatio: { type: splitRatioSchema, required: true, default: () => ({ parent1: 50, parent2: 50 }) },
  receiptUrl: { type: String, trim: true, default: null },
  status: { type: String, enum: ["proposed", "approved", "disputed", "settled"], required: true, default: "proposed", index: true },
  approvals: { type: [expenseApprovalSchema], required: true, default: [] },
  resolutionNote: { type: String, trim: true, maxlength: 1000, default: null },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  resolvedAt: { type: Date, default: null },
  settledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  settledAt: { type: Date, default: null },
  createdAt: { type: Date, required: true, default: Date.now, immutable: true },
}, { optimisticConcurrency: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Valid transitions are proposed -> approved/disputed, approved -> settled, and
// disputed -> settled only with a recorded manual resolution; settled is terminal.
expenseSchema.pre("validate", function validateExpense() {
  const parent1 = Number(this.splitRatio?.parent1);
  const parent2 = Number(this.splitRatio?.parent2);
  if (!Number.isFinite(parent1) || !Number.isFinite(parent2) || Math.abs(parent1 + parent2 - 100) > 0.000001) {
    this.invalidate("splitRatio", "The parent split percentages must sum to 100");
  }
  if (Number.isFinite(this.amount) && Math.abs(this.amount * 100 - Math.round(this.amount * 100)) > 0.000001) {
    this.invalidate("amount", "Amount can contain at most two decimal places");
  }
  const latestApproval = this.approvals.at(-1);
  if (this.status === "approved" && latestApproval?.action !== "approve") this.invalidate("approvals", "An approved expense requires an approval action");
  if (this.status === "disputed" && (latestApproval?.action !== "dispute" || !latestApproval.note?.trim())) this.invalidate("approvals", "A disputed expense requires a dispute action and note");
  if (this.status === "settled") {
    if (!this.settledBy || !this.settledAt) this.invalidate("settledBy", "A settled expense requires settlement details");
    if (!latestApproval) this.invalidate("approvals", "A settled expense must have been approved or disputed first");
    if (latestApproval?.action === "dispute" && !this.resolutionNote?.trim()) this.invalidate("resolutionNote", "A disputed expense requires a manual resolution note before settlement");
  }
});
expenseSchema.index({ familyId: 1, status: 1, createdAt: -1 });
expenseSchema.index({ familyId: 1, childId: 1, createdAt: -1 });
expenseSchema.virtual("family").get(function () { return this.familyId; });
expenseSchema.virtual("childIds").get(function () { return [this.childId]; });
expenseSchema.virtual("amountMinor").get(function () { return Math.round(this.amount * 100); });
expenseSchema.virtual("expenseDate").get(function () { return this.createdAt; });
expenseSchema.virtual("category").get(() => "shared");
expenseSchema.virtual("receipt").get(function () { return this.receiptUrl ? { url: this.receiptUrl, originalName: "Receipt" } : undefined; });

const messageLogSchema = new Schema({
  familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, minlength: 1, maxlength: 5000 },
  timestamp: { type: Date, required: true, default: Date.now, immutable: true },
  editedFlag: {
    type: Boolean,
    required: true,
    default: false,
    immutable: true,
    validate: { validator: (value) => value === false, message: "Messages can never be marked as edited" },
  },
  // Existing v1 decisions and attachments remain append-only message metadata.
  messageType: { type: String, enum: ["message", "decision"], required: true, default: "message", index: true },
  attachments: { type: [assetSchema], default: [], validate: { validator: (items) => items.length <= 5, message: "At most five attachments are allowed" } },
}, { versionKey: false, collection: "message_logs", toJSON: { virtuals: true }, toObject: { virtuals: true } });
messageLogSchema.index({ familyId: 1, timestamp: -1, _id: -1 });
messageLogSchema.virtual("family").get(function () { return this.familyId; });
messageLogSchema.virtual("sender").get(function () { return this.senderId; });
messageLogSchema.virtual("body").get(function () { return this.content; });
messageLogSchema.virtual("createdAt").get(function () { return this.timestamp; });
makeAppendOnly(messageLogSchema, "MessageLog");

const auditLogSchema = new Schema({
  familyId: { type: Schema.Types.ObjectId, ref: "Family", default: null, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  action: { type: String, required: true, trim: true, maxlength: 100, index: true },
  entityType: { type: String, required: true, trim: true, maxlength: 100, index: true },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  previousState: { type: Schema.Types.Mixed, default: null },
  newState: { type: Schema.Types.Mixed, default: null },
  timestamp: { type: Date, required: true, default: Date.now, immutable: true },
}, { versionKey: false, collection: "audit_logs", toJSON: { virtuals: true }, toObject: { virtuals: true } });
auditLogSchema.index({ familyId: 1, timestamp: -1, _id: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.virtual("family").get(function () { return this.familyId; });
auditLogSchema.virtual("actor").get(function () { return this.actorId; });
auditLogSchema.virtual("before").get(function () { return this.previousState; });
auditLogSchema.virtual("after").get(function () { return this.newState; });
auditLogSchema.virtual("occurredAt").get(function () { return this.timestamp; });
makeAppendOnly(auditLogSchema, "AuditLog");

export const User = models.User || model("User", userSchema);
export const Family = models.Family || model("Family", familySchema);
export const CustodyEvent = models.CustodyEvent || model("CustodyEvent", custodyEventSchema);
export const Expense = models.Expense || model("Expense", expenseSchema);
export const MessageLog = models.MessageLog || model("MessageLog", messageLogSchema);
export const AuditLog = models.AuditLog || model("AuditLog", auditLogSchema);
