import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter;

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

function layout({ preheader, heading, greeting, body, detailRows = [], actionLabel, actionUrl }) {
  const rows = detailRows.map(([label, value]) => `<tr><td style="padding:8px 12px;color:#687870;font-size:13px">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#243b33;font-size:13px;font-weight:700">${escapeHtml(value)}</td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f3f1e9;font-family:Arial,sans-serif;color:#243b33"><span style="display:none">${escapeHtml(preheader)}</span><table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding:32px 14px"><table width="100%" style="max-width:580px;background:#fffdf9;border:1px solid #dde2dc;border-radius:18px;overflow:hidden" role="presentation"><tr><td style="padding:24px 28px;background:#285c4f;color:#fff"><div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#bfd5cd">CoParent Coordinator</div><h1 style="margin:8px 0 0;font-size:24px">${escapeHtml(heading)}</h1></td></tr><tr><td style="padding:28px"><p style="margin:0 0 16px;font-size:15px">${escapeHtml(greeting)}</p><p style="margin:0 0 20px;color:#4f625a;line-height:1.6">${escapeHtml(body)}</p>${rows ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;background:#f5f6f2;border-radius:12px">${rows}</table>` : ""}<a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:11px 18px;color:#fff;background:#d97855;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none">${escapeHtml(actionLabel)}</a><p style="margin:24px 0 0;color:#87928d;font-size:12px">This is an automated family-workflow notification. Sign in to review the permanent record.</p></td></tr></table></td></tr></table></body></html>`;
}

const templates = {
  newSwapRequest(data) {
    return {
      text: `${data.actorName} proposed a custody swap from ${formatDate(data.startDate)} to ${formatDate(data.endDate)}. Sign in to review it: ${data.actionUrl}`,
      html: layout({ preheader: "A custody swap needs your response", heading: "New swap request", greeting: `Hello ${data.recipientName},`, body: `${data.actorName} proposed new custody dates and is waiting for your response.`, detailRows: [["Family", data.familyName], ["New start", formatDate(data.startDate)], ["New end", formatDate(data.endDate)]], actionLabel: "Review custody calendar", actionUrl: data.actionUrl }),
    };
  },
  newExpenseProposed(data) {
    return {
      text: `${data.actorName} proposed the expense "${data.expenseTitle}" for ${data.amount}. Sign in to review it: ${data.actionUrl}`,
      html: layout({ preheader: "A shared expense needs your review", heading: "New expense proposed", greeting: `Hello ${data.recipientName},`, body: `${data.actorName} added a child-related expense for your approval.`, detailRows: [["Expense", data.expenseTitle], ["Amount", data.amount], ["Family", data.familyName]], actionLabel: "Review expense", actionUrl: data.actionUrl }),
    };
  },
  expenseDisputed(data) {
    return {
      text: `${data.actorName} disputed "${data.expenseTitle}". Reason: ${data.reason}. View the record: ${data.actionUrl}`,
      html: layout({ preheader: "An expense was disputed", heading: "Expense disputed", greeting: `Hello ${data.recipientName},`, body: `${data.actorName} disputed an expense proposal. The reason is now part of its permanent history.`, detailRows: [["Expense", data.expenseTitle], ["Reason", data.reason], ["Family", data.familyName]], actionLabel: "View expense history", actionUrl: data.actionUrl }),
    };
  },
  generic(data) {
    return { text: data.text, html: layout({ preheader: data.subject, heading: data.subject, greeting: "Hello,", body: data.text, actionLabel: "Open CoParent", actionUrl: data.actionUrl }) };
  },
};

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host) return null;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return transporter;
}

export async function sendNotificationEmail(to, subject, templateName, data = {}) {
  const mailer = getTransporter();
  if (!mailer || !to) return { skipped: true };
  const render = templates[templateName];
  if (!render) throw new Error(`Unknown email template: ${templateName}`);
  const message = render({ ...data, actionUrl: data.actionUrl || config.clientUrl });
  try {
    const info = await mailer.sendMail({ from: config.smtp.from, to, subject, ...message });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email notification failed", error.message);
    return { sent: false, error: error.message };
  }
}

// Backward-compatible generic notification for the existing message workflow.
export function sendNotification({ to, subject, text }) {
  return sendNotificationEmail(to, subject, "generic", { subject, text, actionUrl: `${config.clientUrl}/messages` });
}

export function setEmailTransportForTests(value) {
  transporter = value;
}
