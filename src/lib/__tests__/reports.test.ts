import assert from "node:assert/strict";
import { csvEscape, csvRow, previousPeriod } from "../report-utils";
import { parseReportFilters, reportQueryString } from "../reports";
import { roleHasPlatformPermission } from "../platform-plans";

type TestCase = {
  name: string;
  run: () => void;
};

const tests: TestCase[] = [];

function test(name: string, run: () => void) {
  tests.push({ name, run });
}

test("report filters default to a bounded period and serialize stable query params", () => {
  const filters = parseReportFilters(new URLSearchParams("from=2026-05-01&to=2026-05-21&source=public_page"));
  assert.equal(filters.from.getFullYear(), 2026);
  assert.equal(filters.from.getMonth(), 4);
  assert.equal(filters.from.getDate(), 1);
  assert.equal(filters.to.getDate(), 21);
  assert.equal(filters.source, "public_page");
  assert.equal(reportQueryString(filters).includes("source=public_page"), true);
});

test("overlong report filters are capped", () => {
  const filters = parseReportFilters(new URLSearchParams("from=2024-01-01&to=2026-05-21"));
  assert.equal(filters.warnings.length, 1);
  assert.ok(filters.to.getTime() - filters.from.getTime() <= 370 * 24 * 60 * 60 * 1000);
});

test("previous period mirrors selected range length", () => {
  const from = new Date("2026-05-11T00:00:00.000Z");
  const to = new Date("2026-05-21T00:00:00.000Z");
  const previous = previousPeriod(from, to);
  assert.equal(previous.from.toISOString(), "2026-05-01T00:00:00.000Z");
  assert.equal(previous.to.toISOString(), "2026-05-11T00:00:00.000Z");
});

test("csv escaping is formula-safe and Excel-compatible", () => {
  assert.equal(csvEscape('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvRow(["safe", "comma,value"]), 'safe,"comma,value"');
});

test("marketing reports use a dedicated permission", () => {
  assert.equal(roleHasPlatformPermission("marketing", "viewMarketingReports"), true);
  assert.equal(roleHasPlatformPermission("marketing", "viewFinance"), false);
  assert.equal(roleHasPlatformPermission("sales_agent", "viewMarketingReports"), false);
});

for (const testCase of tests) {
  testCase.run();
  console.log(`ok - ${testCase.name}`);
}
