import assert from "node:assert/strict";
import { normalizeLeadStatus } from "../lead-status";
import { taskIsOverdue } from "../crm";
import { clientVisibilityWhere, leadVisibilityWhere, taskVisibilityWhere } from "../crm-access";
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
