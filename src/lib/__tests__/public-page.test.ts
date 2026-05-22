import assert from "node:assert/strict";
import { leadSourceLabel, normalizeLeadSource } from "../lead-sources";
import { colorContrastRatio, publicPageColorWarnings, translatePublicText } from "../public-page";
import { buildLeadTelegramMessage, nextTelegramAttempt } from "../telegram";

type TestCase = { name: string; run: () => void };
const tests: TestCase[] = [];

function test(name: string, run: () => void) {
  tests.push({ name, run });
}

test("lead source aliases normalize legacy public sources", () => {
  assert.equal(normalizeLeadSource("bosh-sahifa"), "public_page");
  assert.equal(normalizeLeadSource("kvartiralar"), "apartment_page");
  assert.equal(normalizeLeadSource("vizual"), "visual_explorer");
  assert.equal(normalizeLeadSource("floating_matchmaker"), "floating_contact");
  assert.equal(normalizeLeadSource("Some Campaign!"), "some_campaign");
  assert.equal(leadSourceLabel("visual_explorer", "ru"), "Визуальный выбор");
});

test("public page text falls back across locales", () => {
  assert.equal(translatePublicText({ ru: "Привет", en: "Hello" }, "uz", "Fallback"), "Привет");
  assert.equal(translatePublicText({ uz: "Salom" }, "uz", "Fallback"), "Salom");
  assert.equal(translatePublicText(null, "uz", "Fallback"), "Fallback");
});

test("brand color warnings catch unreadable text pairs", () => {
  assert.equal(colorContrastRatio("#000000", "#ffffff") >= 4.5, true);
  assert.equal(publicPageColorWarnings({ primaryColor: "#ffffff", backgroundColor: "#ffffff", textColor: "#ffffff" }).length > 0, true);
});

test("telegram message includes CRM only when CRM is enabled", () => {
  const lead = {
    id: "lead-1",
    name: "Ali",
    phone: "+998901234567",
    source: "public_page",
    projectName: "Navruz",
    unitLabel: "A / 4 / 401",
    preferredLanguage: "uz",
    utmCampaign: "spring",
    createdAt: new Date("2026-05-21T10:00:00.000Z"),
  };
  assert.equal(buildLeadTelegramMessage(lead, { crmEnabled: false }).includes("CRM:"), false);
  assert.equal(buildLeadTelegramMessage(lead, { crmEnabled: true, crmBaseUrl: "https://crm.example" }).includes("CRM:"), true);
  assert.equal(buildLeadTelegramMessage(lead).includes("Phone: +998901234567"), true);
});

test("telegram retry backoff uses one, five, then fifteen minute windows", () => {
  const now = new Date("2026-05-21T10:00:00.000Z");
  assert.equal(nextTelegramAttempt(0, now).toISOString(), "2026-05-21T10:01:00.000Z");
  assert.equal(nextTelegramAttempt(1, now).toISOString(), "2026-05-21T10:05:00.000Z");
  assert.equal(nextTelegramAttempt(5, now).toISOString(), "2026-05-21T10:15:00.000Z");
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

if (failures > 0) process.exitCode = 1;
