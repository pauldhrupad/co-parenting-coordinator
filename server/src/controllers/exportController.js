import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import { AuditLog, Family, MessageLog } from "../models/index.js";
import { descriptionFor } from "./auditController.js";
import { AppError } from "../utils/http.js";

function parseBoundary(value, endOfDay) {
  if (!value) return endOfDay ? new Date() : new Date(0);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z` : value);
  if (Number.isNaN(date.getTime())) throw new AppError(400, `Invalid ${endOfDay ? "endDate" : "startDate"}`);
  return date;
}

function safeFilename(value) {
  return String(value).replaceAll(/[^a-z0-9]+/gi, "-").replaceAll(/^-|-$/g, "").toLowerCase() || "family";
}

function csvCell(value) {
  let text = String(value ?? "").replaceAll(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

async function exportEntries(familyId, startDate, endDate) {
  const range = { $gte: startDate, $lte: endDate };
  const [auditEntries, messages] = await Promise.all([
    AuditLog.find({ familyId, timestamp: range }).populate("actorId", "name").lean({ virtuals: true }),
    MessageLog.find({ familyId, timestamp: range }).populate("senderId", "name").lean({ virtuals: true }),
  ]);
  return [
    ...auditEntries.map((entry) => ({ timestamp: entry.timestamp, actor: entry.actorId?.displayName || entry.actorId?.name || "System", type: "audit", description: descriptionFor(entry) })),
    ...messages.map((message) => ({ timestamp: message.timestamp, actor: message.senderId?.displayName || message.senderId?.name || "Parent", type: "message", description: message.content })),
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function makePdf({ family, entries, startDate, endDate }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 54, bufferPages: true, info: { Title: `${family.name} history export`, Author: "CoParent Coordinator" } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fillColor("#285c4f").fontSize(22).font("Helvetica-Bold").text("CoParent Coordinator");
    doc.moveDown(0.25).fillColor("#243b33").fontSize(17).text(`${family.name} - Family History`);
    doc.moveDown(0.35).fillColor("#687870").font("Helvetica").fontSize(9).text(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    doc.text(`Generated: ${new Date().toISOString()} | Entries: ${entries.length}`);
    doc.moveDown(1).strokeColor("#d9e1dc").moveTo(54, doc.y).lineTo(541, doc.y).stroke();

    if (!entries.length) {
      doc.moveDown(2).fillColor("#687870").fontSize(12).text("No audit or message entries were recorded in this date range.", { align: "center" });
    }
    entries.forEach((entry) => {
      doc.moveDown(0.9).fillColor(entry.type === "audit" ? "#285c4f" : "#9a6349").font("Helvetica-Bold").fontSize(9).text(`${entry.type.toUpperCase()}  |  ${new Date(entry.timestamp).toISOString()}`);
      doc.moveDown(0.2).fillColor("#243b33").font("Helvetica-Bold").fontSize(10).text(entry.actor);
      doc.moveDown(0.15).fillColor("#4f625a").font("Helvetica").fontSize(10).text(entry.description, { lineGap: 2 });
      doc.moveDown(0.5).strokeColor("#e6e9e4").moveTo(54, doc.y).lineTo(541, doc.y).stroke();
    });

    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc.fillColor("#87928d").font("Helvetica").fontSize(8).text(`Page ${index + 1} of ${range.count}`, 54, 806, { width: 487, align: "right" });
    }
    doc.end();
  });
}

export async function exportFamilyHistory(req, res) {
  if (!mongoose.isValidObjectId(req.params.familyId)) throw new AppError(400, "A valid familyId is required");
  const family = await Family.findById(req.params.familyId);
  if (!family) throw new AppError(404, "Family not found");
  if (!family.parents.some((id) => id.equals(req.user._id))) throw new AppError(403, "You do not have access to this family");

  const format = String(req.query.format || "pdf").toLowerCase();
  if (!["pdf", "csv"].includes(format)) throw new AppError(400, "format must be pdf or csv");
  const startDate = parseBoundary(req.query.startDate, false);
  const endDate = parseBoundary(req.query.endDate, true);
  if (endDate < startDate) throw new AppError(400, "endDate must be on or after startDate");
  const entries = await exportEntries(family._id, startDate, endDate);
  const filename = `${safeFilename(family.name)}-history-${new Date().toISOString().slice(0, 10)}.${format}`;

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "private, no-store");
  if (format === "csv") {
    const rows = [["timestamp", "actor", "type", "description/content"], ...entries.map((entry) => [new Date(entry.timestamp).toISOString(), entry.actor, entry.type, entry.description])];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    return res.type("text/csv; charset=utf-8").send(csv);
  }

  const pdf = await makePdf({ family, entries, startDate, endDate });
  return res.type("application/pdf").send(pdf);
}

