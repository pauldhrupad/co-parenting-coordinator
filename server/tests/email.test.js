import { afterEach, describe, expect, it, vi } from "vitest";
import { sendNotificationEmail, setEmailTransportForTests } from "../src/services/email.js";

afterEach(() => setEmailTransportForTests(null));

describe("notification email templates", () => {
  it.each([
    ["newSwapRequest", { recipientName: "Parent B", actorName: "Parent A", familyName: "Test Family", startDate: "2026-09-10T09:00:00Z", endDate: "2026-09-10T17:00:00Z" }, "New swap request"],
    ["custodySwapAccepted", { recipientName: "Parent B", actorName: "Parent A", familyName: "Test Family", startDate: "2026-09-10T09:00:00Z", endDate: "2026-09-10T17:00:00Z" }, "Custody swap accepted"],
    ["custodySwapRejected", { recipientName: "Parent B", actorName: "Parent A", familyName: "Test Family", startDate: "2026-09-10T09:00:00Z", endDate: "2026-09-10T17:00:00Z" }, "Custody swap declined"],
    ["newExpenseProposed", { recipientName: "Parent B", actorName: "Parent A", familyName: "Test Family", expenseTitle: "School books", amount: "₹1,200.00" }, "New expense proposed"],
    ["expenseDisputed", { recipientName: "Parent A", actorName: "Parent B", familyName: "Test Family", expenseTitle: "School books", reason: "Receipt required" }, "Expense disputed"],
    ["expenseApproved", { recipientName: "Parent A", actorName: "Parent B", familyName: "Test Family", expenseTitle: "School books", amount: "₹1,200.00" }, "Expense approved"],
    ["expenseSettled", { recipientName: "Parent B", actorName: "Parent A", familyName: "Test Family", expenseTitle: "School books", amount: "₹1,200.00", resolutionNote: "Receipt verified" }, "Expense settled"],
  ])("renders and sends the %s template", async (templateName, data, heading) => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "test-message" });
    setEmailTransportForTests({ sendMail });
    const result = await sendNotificationEmail("parent@example.com", heading, templateName, { ...data, actionUrl: "http://localhost:5173" });
    expect(result).toMatchObject({ sent: true, messageId: "test-message" });
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0];
    expect(message.html).toContain(heading);
    expect(message.text).toBeTruthy();
    expect(message.to).toBe("parent@example.com");
  });
});
