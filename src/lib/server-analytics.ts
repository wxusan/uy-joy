/**
 * Lightweight server-side event capture for PostHog.
 * Uses PostHog's HTTP capture endpoint directly — no posthog-node dependency.
 * Fire-and-forget: never throws, never blocks the caller.
 *
 * Pass `distinctId` to scope the event to a specific tenant or user identity
 * (e.g. the project's clientId slug). Without it the event lands under the
 * shared "server" identity, which prevents per-tenant filtering in PostHog.
 */
export function captureServerEvent(
  event: string,
  properties: Record<string, unknown> = {},
  distinctId = "server"
) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return;

  const host =
    (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");

  fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      event,
      distinct_id: distinctId,
      properties,
    }),
  }).catch(() => {
    // Intentionally silenced — analytics must never fail the caller.
  });
}
