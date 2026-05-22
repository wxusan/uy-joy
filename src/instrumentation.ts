import { assertRequiredClientEnv } from "./lib/platform-settings";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    assertRequiredClientEnv();
  }
}
