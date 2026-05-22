import assert from "node:assert/strict";
import {
  ADMIN_ACCESS_ROLES,
  PLATFORM_FEATURES,
  PLATFORM_PLAN_KEYS,
  PLATFORM_PLANS,
  featureEntitlementIsEnabled,
  getFeatureEntitlement,
  hasPlatformFeature,
  normalizePlatformRole,
  roleHasPlatformPermission,
} from "../platform-plans";
import { createPlatformSettings, getClientEnvStatus, getPlatformSettings, platformSettingsHasFeature, resetPlatformSettingsCache } from "../platform-settings";

type TestCase = {
  name: string;
  run: () => void;
};

const tests: TestCase[] = [];

function test(name: string, run: () => void) {
  tests.push({ name, run });
}

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const previous: Record<string, string | undefined> = {};

  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    const value = values[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const key of Object.keys(values)) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("every platform plan defines every platform feature", () => {
  for (const plan of PLATFORM_PLAN_KEYS) {
    assert.deepEqual(Object.keys(PLATFORM_PLANS[plan].features).sort(), [...PLATFORM_FEATURES].sort());
  }
});

test("add-on entitlements are available to sell but not enabled", () => {
  assert.equal(featureEntitlementIsEnabled("add_on"), false);
  assert.equal(featureEntitlementIsEnabled("optional_display"), true);
  assert.equal(featureEntitlementIsEnabled("call_log"), true);
  assert.equal(getFeatureEntitlement("lead_page_bot", "inventory"), "optional_display");
  assert.equal(getFeatureEntitlement("crm_starter", "calling"), "call_log");
  assert.equal(hasPlatformFeature("real_estate_crm_growth", "aiAssistant"), false);
  assert.equal(hasPlatformFeature("full_sales_platform", "customerPortal"), false);
  assert.equal(hasPlatformFeature("full_sales_platform", "aiAssistant"), true);
});

test("platform settings loader memoizes until reset", () => {
  withEnv({ CLIENT_PLATFORM_PLAN: "lead_page_bot" }, () => {
    resetPlatformSettingsCache();
    assert.equal(getPlatformSettings().plan, "lead_page_bot");
    process.env.CLIENT_PLATFORM_PLAN = "full_sales_platform";
    assert.equal(getPlatformSettings().plan, "lead_page_bot");
    resetPlatformSettingsCache();
    assert.equal(getPlatformSettings().plan, "full_sales_platform");
  });
  resetPlatformSettingsCache();
});

test("legacy and optional platform roles normalize to v1 roles", () => {
  assert.equal(normalizePlatformRole("superadmin"), "owner");
  assert.equal(normalizePlatformRole("finance"), "back_office");
  assert.equal(normalizePlatformRole("legal"), "back_office");
  assert.equal(normalizePlatformRole("sales_agent"), "sales_agent");
  assert.equal(normalizePlatformRole("unknown"), null);
});

test("permission checks honor normalized roles", () => {
  assert.equal(roleHasPlatformPermission("superadmin", "manageUsers"), true);
  assert.equal(roleHasPlatformPermission("finance", "viewFinance"), true);
  assert.equal(roleHasPlatformPermission("marketing", "viewMarketingReports"), true);
  assert.equal(roleHasPlatformPermission("marketing", "viewReports"), false);
  assert.equal(roleHasPlatformPermission("sales_agent", "manageInventory"), false);
  assert.equal(ADMIN_ACCESS_ROLES.includes("superadmin"), true);
});

test("client platform plan env wins over legacy platform plan env", () => {
  withEnv(
    {
      CLIENT_PLATFORM_PLAN: "real_estate_crm_growth",
      PLATFORM_PLAN: "lead_page_bot",
    },
    () => {
      const settings = createPlatformSettings();
      assert.equal(settings.plan, "real_estate_crm_growth");
      assert.equal(settings.limits.users, 10);
      assert.equal(platformSettingsHasFeature(settings, "inventory"), true);
    }
  );
});

test("feature flag env overrides merge on top of the selected plan", () => {
  withEnv(
    {
      CLIENT_PLATFORM_PLAN: "lead_page_bot",
      CLIENT_FEATURE_FLAGS: JSON.stringify({ inventory: true, aiAssistant: "basic", nope: true }),
    },
    () => {
      const settings = createPlatformSettings();
      assert.equal(platformSettingsHasFeature(settings, "inventory"), true);
      assert.equal(platformSettingsHasFeature(settings, "aiAssistant"), true);
      assert.equal(platformSettingsHasFeature(settings, "pipeline"), false);
    }
  );
});

test("env status reports missing required variables and configured optional variables", () => {
  withEnv(
    {
      DATABASE_URL: "postgres://example",
      DIRECT_URL: undefined,
      NEXTAUTH_SECRET: "secret",
      NEXTAUTH_URL: "https://example.com",
      CLIENT_SLUG: "navruz",
      CLIENT_PLATFORM_PLAN: "crm_starter",
      CRON_SECRET: "cron",
      CLOUDINARY_CLOUD_NAME: "cloud",
      CLOUDINARY_API_KEY: "key",
      CLOUDINARY_API_SECRET: "secret",
      OPENAI_API_KEY: "openai",
    },
    () => {
      const status = getClientEnvStatus();
      assert.equal(status.missingRequired.includes("DIRECT_URL"), true);
      assert.equal(status.missingRequired.includes("CLIENT_SLUG"), false);
      assert.equal(status.configuredOptional.includes("OPENAI_API_KEY"), true);
    }
  );
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
