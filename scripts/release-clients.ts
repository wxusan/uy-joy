import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

type ClientReleaseTarget = {
  slug: string;
  site: string;
  expectedCommit?: string;
  promote?: boolean;
  vercelProjectId?: string;
  vercelDeploymentId?: string;
  vercelDeploymentUrl?: string;
  vercelTeamId?: string;
  vercelTeamSlug?: string;
  smokeAdminEmail?: string;
  smokeAdminPasswordEnv?: string;
};

type ReleaseConfig = {
  targets: ClientReleaseTarget[];
};

type VercelDeploymentSummary = {
  uid?: string;
  meta?: Record<string, string | undefined>;
};

async function readConfig() {
  const path = process.env.RELEASE_CLIENTS_FILE || "docs/release/clients.example.json";
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as ReleaseConfig;
}

function shouldPromote(target: ClientReleaseTarget) {
  return target.promote || process.env.RELEASE_PROMOTE_VERCEL === "1";
}

async function vercelRequest(path: string, target: ClientReleaseTarget, init: RequestInit = {}) {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("Set VERCEL_API_TOKEN to promote Vercel deployments.");

  const url = new URL(`https://api.vercel.com${path}`);
  if (target.vercelTeamId) url.searchParams.set("teamId", target.vercelTeamId);
  if (target.vercelTeamSlug) url.searchParams.set("slug", target.vercelTeamSlug);

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Vercel API ${url.pathname} failed for ${target.slug}: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function findLatestReadyDeployment(target: ClientReleaseTarget) {
  if (!target.vercelProjectId) throw new Error(`${target.slug} needs vercelProjectId to auto-select a deployment.`);

  const params = new URLSearchParams({
    projectId: target.vercelProjectId,
    state: "READY",
    target: "production",
    limit: "20",
  });
  const data = await vercelRequest(`/v6/deployments?${params.toString()}`, target);
  const deployments: VercelDeploymentSummary[] = Array.isArray(data.deployments) ? data.deployments : [];
  const match = deployments.find((deployment) => {
    if (!target.expectedCommit) return true;
    const meta = deployment.meta || {};
    return (
      meta.githubCommitSha === target.expectedCommit ||
      meta.gitlabCommitSha === target.expectedCommit ||
      meta.bitbucketCommitSha === target.expectedCommit
    );
  });
  if (!match?.uid) throw new Error(`No READY production deployment found for ${target.slug}.`);
  return match.uid as string;
}

async function promoteVercelDeployment(target: ClientReleaseTarget) {
  if (!shouldPromote(target)) return;
  if (!target.vercelProjectId) throw new Error(`${target.slug} needs vercelProjectId to promote.`);

  let deploymentId = target.vercelDeploymentId;
  if (target.vercelDeploymentUrl && !target.vercelDeploymentId) {
    const deployment = await vercelRequest(`/v13/deployments/${encodeURIComponent(target.vercelDeploymentUrl)}`, target);
    deploymentId = deployment.uid || deployment.id;
  }
  if (!deploymentId) deploymentId = await findLatestReadyDeployment(target);
  if (!deploymentId) throw new Error(`Could not resolve deployment id for ${target.slug}.`);

  console.log(`Promoting Vercel deployment for ${target.slug}: ${deploymentId}`);
  await vercelRequest(`/v10/projects/${target.vercelProjectId}/promote/${deploymentId}`, target, { method: "POST" });
}

function runSmoke(target: ClientReleaseTarget) {
  const env = {
    ...process.env,
    SMOKE_SITE: target.site,
    SMOKE_ADMIN_EMAIL: target.smokeAdminEmail || "",
    SMOKE_ADMIN_PASSWORD: target.smokeAdminPasswordEnv ? process.env[target.smokeAdminPasswordEnv] || "" : "",
  };
  const result = spawnSync("npm", ["run", "smoke:client"], { env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Smoke failed for ${target.slug}`);
  if (target.smokeAdminEmail && target.smokeAdminPasswordEnv) {
    const authResult = spawnSync("npm", ["run", "smoke:authenticated"], { env, stdio: "inherit" });
    if (authResult.status !== 0) throw new Error(`Authenticated smoke failed for ${target.slug}`);
  }
}

async function main() {
  const config = await readConfig();
  if (!config.targets.length) throw new Error("No release targets configured.");

  for (const target of config.targets) {
    console.log(`\n=== ${target.slug} (${target.site}) ===`);
    await promoteVercelDeployment(target);
    runSmoke(target);
  }
  console.log("\nAll configured client smoke checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
