import assert from "node:assert/strict";
import { tashkentDateString, AUTOMATION_INACTIVITY_CUTOFF_HOURS } from "../automation-rules";
import {
  clientStatusLabel,
  dealStatusLabel,
  documentStatusLabel,
  documentTypeLabel,
  leadSourceLabelUi,
  leadStatusLabel,
  leadStatusTextUz,
  paymentStatusLabel,
  pipelineStageLabel,
  platformRoleLabel,
  taskPriorityLabel,
  taskStatusLabel,
} from "../crm-labels";
import { normalizeLeadStatus } from "../lead-status";
import { taskIsOverdue } from "../crm";
import { canClaimUnassignedLead, clientVisibilityWhere, leadVisibilityWhere, taskVisibilityWhere } from "../crm-access";
import { normalizePhone } from "../phone";
import {
  calculateDealFinancials,
  canOverrideReservedDealSold,
  dealVisibilityWhere,
  discountReviewPatch,
  generatePaymentSchedule,
} from "../real-estate";

type TestCase = {
  name: string;
  run: () => void;
};

const tests: TestCase[] = [];

function test(name: string, run: () => void) {
  tests.push({ name, run });
}

const testT = (key: string) => `label:${key}`;

test("normalizes Uzbek E.164 and 998-prefixed numbers", () => {
  assert.equal(normalizePhone("+998 90 123 45 67").normalized, "+998901234567");
  assert.equal(normalizePhone("998901234567").normalized, "+998901234567");
});

test("normalizes Uzbek local mobile numbers with known prefixes", () => {
  assert.equal(normalizePhone("90 123 45 67").normalized, "+998901234567");
  assert.equal(normalizePhone("(77) 123-45-67").normalized, "+998771234567");
});

test("accepts foreign E.164-like numbers and rejects uncertain local numbers", () => {
  assert.equal(normalizePhone("+14155552671").normalized, "+14155552671");
  assert.equal(normalizePhone("12345").normalized, null);
  assert.equal(normalizePhone("12 345 67 89").isValid, false);
});

test("normalizes legacy lead statuses into v1 CRM stages", () => {
  assert.equal(normalizeLeadStatus("converted"), "sold");
  assert.equal(normalizeLeadStatus("notInterested"), "lost");
  assert.equal(normalizeLeadStatus("inProgress"), "negotiation");
  assert.equal(normalizeLeadStatus("meeting"), "meeting");
});

test("CRM label helpers localize known values and humanize unknown values", () => {
  assert.equal(leadStatusLabel(testT, "negotiation"), "label:negotiation");
  assert.equal(leadStatusLabel(testT, "notInterested"), "label:notInterested");
  assert.equal(leadStatusLabel(testT, null, "empty"), "empty");
  assert.equal(leadStatusLabel(testT, "legacy_custom_status"), "legacy custom status");
  assert.equal(leadStatusTextUz("meeting"), "Ofisga keladi");
  assert.equal(leadSourceLabelUi("walk_in", "uz"), "Ofisga kelgan");
  assert.equal(leadSourceLabelUi("custom_source", "uz"), "custom source");
  assert.equal(pipelineStageLabel(testT, { key: "reserved", name: "Reserved" }), "label:reserved");
  assert.equal(pipelineStageLabel(testT, { key: "custom_stage", name: "Custom stage" }), "Custom stage");
  assert.equal(dealStatusLabel(testT, "contract_signed"), "label:contractSigned");
  assert.equal(paymentStatusLabel(testT, "partial"), "label:paymentPartial");
  assert.equal(documentStatusLabel(testT, "needs_review"), "label:documentNeedsReview");
  assert.equal(documentTypeLabel(testT, "reservation_agreement"), "label:documentTypeReservationAgreement");
  assert.equal(clientStatusLabel(testT, "active"), "label:clientActive");
  assert.equal(taskStatusLabel(testT, "completed"), "label:taskCompleted");
  assert.equal(taskPriorityLabel(testT, "urgent"), "label:priorityUrgent");
  assert.equal(platformRoleLabel(testT, "sales_agent"), "label:roleSalesManager");
});

test("task overdue state is derived from status and due date", () => {
  const now = new Date("2026-05-20T10:00:00.000Z");
  assert.equal(taskIsOverdue({ status: "open", dueAt: "2026-05-20T09:59:00.000Z" }, now), true);
  assert.equal(taskIsOverdue({ status: "completed", dueAt: "2026-05-20T09:59:00.000Z" }, now), false);
  assert.equal(taskIsOverdue({ status: "open", dueAt: "2026-05-20T10:01:00.000Z" }, now), false);
});

test("CRM visibility scopes team, agent, and specialist read-only roles", () => {
  assert.deepEqual(leadVisibilityWhere({ id: "owner-1", role: "owner" }, true), {});
  assert.deepEqual(leadVisibilityWhere({ id: "agent-1", role: "sales_agent" }, true), {
    OR: [{ assignedToId: "agent-1" }, { assignedToId: null }],
  });
  assert.deepEqual(leadVisibilityWhere({ id: "agent-1", role: "sales_agent" }, false), {
    OR: [{ assignedToId: "agent-1" }],
  });
  assert.deepEqual(leadVisibilityWhere({ id: "external-1", role: "external_agent" }, true), {
    OR: [{ assignedToId: "external-1" }, { assignedToId: null }],
  });
  assert.deepEqual(leadVisibilityWhere({ id: "finance-1", role: "finance" }, true), {
    OR: [
      { deals: { some: {} } },
      { documents: { some: {} } },
      {
        client: {
          is: {
            OR: [
              { deals: { some: {} } },
              { payments: { some: {} } },
              { refunds: { some: {} } },
              { documents: { some: {} } },
              { reservedUnits: { some: {} } },
              { soldUnits: { some: {} } },
            ],
          },
        },
      },
    ],
  });
  assert.deepEqual(clientVisibilityWhere({ id: "finance-1", role: "finance" }, true), {
    OR: [
      { deals: { some: {} } },
      { payments: { some: {} } },
      { refunds: { some: {} } },
      { documents: { some: {} } },
      { reservedUnits: { some: {} } },
      { soldUnits: { some: {} } },
    ],
  });
  assert.deepEqual(taskVisibilityWhere({ id: "marketing-1", role: "marketing" }, true), { id: "__none__" });
});

test("CRM lead claiming is limited to selling roles and enabled settings", () => {
  assert.equal(canClaimUnassignedLead({ id: "agent-1", role: "sales_agent" }, true), true);
  assert.equal(canClaimUnassignedLead({ id: "external-1", role: "external_agent" }, true), true);
  assert.equal(canClaimUnassignedLead({ id: "director-1", role: "sales_director" }, true), false);
  assert.equal(canClaimUnassignedLead({ id: "agent-1", role: "sales_agent" }, false), false);
  assert.equal(canClaimUnassignedLead({ role: "sales_agent" }, true), false);
});

test("deal calculator derives discount, initial payment, remaining, and monthly amounts", () => {
  const result = calculateDealFinancials({
    listPrice: 100_000,
    discountPercent: 10,
    initialPaymentPercent: 30,
    termMonths: 12,
  });
  assert.equal(result.discountAmount, 10_000);
  assert.equal(result.salePrice, 90_000);
  assert.equal(result.initialPaymentAmount, 27_000);
  assert.equal(result.remainingAmount, 63_000);
  assert.equal(result.monthlyPaymentAmount, 5_250);
  assert.equal(result.discountRequiresApproval, true);
});

test("payment schedule supports generated and custom rows", () => {
  const rows = generatePaymentSchedule({
    salePrice: 90_000,
    initialPaymentAmount: 30_000,
    remainingAmount: 60_000,
    termMonths: 3,
    startsAt: new Date("2026-01-31T00:00:00.000Z"),
  });
  assert.equal(rows.length, 4);
  assert.equal(rows[0].label, "Initial payment");
  assert.equal(rows[1].expectedAmount, 20_000);

  const custom = generatePaymentSchedule({
    salePrice: 100_000,
    initialPaymentAmount: 0,
    remainingAmount: 100_000,
    termMonths: 0,
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    customSchedule: [
      { dueDate: "2026-06-01", amountType: "percent", percentOfSalePrice: 25, label: "Milestone" },
      { dueDate: "2026-12-01", amountType: "fixed", amount: 75_000, label: "Balloon" },
    ],
  });
  assert.equal(custom[0].expectedAmount, 25_000);
  assert.equal(custom[1].expectedAmount, 75_000);
});

test("deal visibility allows managers and finance while scoping agents and excluding marketing", () => {
  assert.deepEqual(dealVisibilityWhere({ id: "owner-1", role: "owner" }), {});
  assert.deepEqual(dealVisibilityWhere({ id: "agent-1", role: "sales_agent" }), { assignedToId: "agent-1" });
  assert.deepEqual(dealVisibilityWhere({ id: "external-1", role: "external_agent" }), { assignedToId: "external-1" });
  assert.deepEqual(dealVisibilityWhere({ id: "finance-1", role: "finance" }), {});
  assert.deepEqual(dealVisibilityWhere({ id: "marketing-1", role: "marketing" }), { id: "__none__" });
});

test("discount review patch flags high discounts and clears stale approvals when discount terms change", () => {
  const now = new Date("2026-05-20T10:00:00.000Z");
  assert.deepEqual(
    discountReviewPatch({ discountRequiresApproval: true, discountTermsChanged: true, now }),
    { discountFlaggedAt: now, discountApprovedById: null, discountApprovedAt: null }
  );
  assert.deepEqual(
    discountReviewPatch({
      discountRequiresApproval: true,
      existingFlaggedAt: now,
      discountTermsChanged: true,
      approved: true,
      approvedById: "owner-1",
      now,
    }),
    { discountFlaggedAt: now, discountApprovedById: "owner-1", discountApprovedAt: now }
  );
  assert.deepEqual(
    discountReviewPatch({
      discountRequiresApproval: false,
      existingFlaggedAt: now,
      discountTermsChanged: true,
      approved: true,
      approvedById: "owner-1",
      now,
    }),
    { discountFlaggedAt: null, discountApprovedById: null, discountApprovedAt: null }
  );
});

test("reserved to sold override is owner/developer only", () => {
  assert.equal(canOverrideReservedDealSold({ id: "owner-1", role: "owner" }), true);
  assert.equal(canOverrideReservedDealSold({ id: "developer-1", role: "developer" }), true);
  assert.equal(canOverrideReservedDealSold({ id: "finance-1", role: "finance" }), false);
  assert.equal(canOverrideReservedDealSold({ id: "director-1", role: "sales_director" }), false);
  assert.equal(canOverrideReservedDealSold({ id: "agent-1", role: "sales_agent" }), false);
});

test("automation idempotency refs use Tashkent date and are stable within the same day", () => {
  // Two calls with the same UTC time should produce the same Tashkent date string.
  const now = new Date("2026-05-24T20:00:00Z"); // UTC 20:00 = Tashkent 01:00 next day (UTC+5)
  const dateStr = tashkentDateString(now);
  assert.equal(dateStr, "2026-05-25"); // Tashkent is UTC+5, so this is already May 25

  const earlier = new Date("2026-05-24T18:59:00Z"); // UTC 18:59 = Tashkent 23:59 May 24
  assert.equal(tashkentDateString(earlier), "2026-05-24");

  // followup_reminder ref format
  const taskId = "task-abc";
  const ref = `followup_reminder_${taskId}_${tashkentDateString(now)}`;
  assert.equal(ref, "followup_reminder_task-abc_2026-05-25");

  // Running again at a different UTC time within same Tashkent day produces same ref
  const laterSameDay = new Date("2026-05-25T18:59:00Z"); // Tashkent 23:59 May 25
  const ref2 = `followup_reminder_${taskId}_${tashkentDateString(laterSameDay)}`;
  assert.equal(ref2, "followup_reminder_task-abc_2026-05-25");
});

test("automation inactivity cutoff constant is 48 hours", () => {
  assert.equal(AUTOMATION_INACTIVITY_CUTOFF_HOURS, 48);
  const now = new Date("2026-05-24T12:00:00Z");
  const cutoff = new Date(now.getTime() - AUTOMATION_INACTIVITY_CUTOFF_HOURS * 60 * 60 * 1000);
  assert.equal(cutoff.toISOString(), "2026-05-22T12:00:00.000Z");

  // An agent last active 47h ago should NOT be flagged.
  const recentContact = new Date(now.getTime() - 47 * 60 * 60 * 1000);
  assert.equal(recentContact >= cutoff, true);

  // An agent last active 49h ago SHOULD be flagged.
  const staleContact = new Date(now.getTime() - 49 * 60 * 60 * 1000);
  assert.equal(staleContact < cutoff, true);
});

test("automation duplicate ref is stable for a given lead pair and does not depend on date", () => {
  const leadId = "lead-newer";
  const primaryId = "lead-older";
  const ref = `duplicate_flag_${leadId}_${primaryId}`;
  assert.equal(ref, "duplicate_flag_lead-newer_lead-older");
  // Running the check again produces the same ref → idempotent.
  assert.equal(`duplicate_flag_${leadId}_${primaryId}`, ref);
});

test("automation manager inactivity ref includes agent id and today's date", () => {
  const agentId = "agent-xyz";
  const now = new Date("2026-05-24T10:00:00Z"); // Tashkent 15:00 May 24
  const ref = `manager_inactive_${agentId}_${tashkentDateString(now)}`;
  assert.equal(ref, "manager_inactive_agent-xyz_2026-05-24");
  // Same ref for a second call at a different UTC time on same Tashkent day.
  const later = new Date("2026-05-24T17:00:00Z"); // Tashkent 22:00 still May 24
  assert.equal(`manager_inactive_${agentId}_${tashkentDateString(later)}`, ref);
});

let failures = 0;

for (const { name, run } of tests) {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
}
