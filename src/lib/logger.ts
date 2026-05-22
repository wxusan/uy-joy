type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const REDACTED = "[redacted]";
const REDACT_KEYS = [/secret/i, /token/i, /password/i, /authorization/i, /cookie/i, /phone/i, /documentUrl/i, /fileUrl/i];

function clientSlug() {
  return process.env.CLIENT_SLUG?.trim() || "unknown-client";
}

function redactValue(key: string, value: unknown, depth = 0): unknown {
  if (REDACT_KEYS.some((pattern) => pattern.test(key))) return REDACTED;
  if (depth > 4) return "[truncated]";
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redactValue(key, item, depth + 1));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
      childKey,
      redactValue(childKey, childValue, depth + 1),
    ])
  );
}

function write(level: LogLevel, message: string, meta: LogMeta = {}) {
  const redactedMeta = redactValue("meta", meta) as LogMeta;
  const payload = {
    level,
    message,
    clientSlug: clientSlug(),
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    ...redactedMeta,
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};
