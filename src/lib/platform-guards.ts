import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import {
  type PlatformFeature,
  type PlatformPermission,
  roleCanAccessAdmin,
  roleHasPlatformPermission,
} from "./platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "./platform-settings";

export type PlatformSessionUser = {
  id?: string;
  role?: string;
};

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function getPlatformSessionUser(): Promise<PlatformSessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as PlatformSessionUser;
}

export async function requirePlatformApiAccess(permission?: PlatformPermission) {
  const user = await getPlatformSessionUser();
  if (!user || !roleCanAccessAdmin(user.role)) {
    return {
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
      user: null,
    };
  }

  if (permission && !roleHasPlatformPermission(user.role, permission)) {
    return { response: forbidden(), user };
  }

  return { response: null, user };
}

export function requirePlatformFeature(feature: PlatformFeature) {
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, feature)) {
    return forbidden(`Feature disabled: ${feature}`);
  }

  return null;
}

export async function requirePlatformApiFeature(feature: PlatformFeature, permission?: PlatformPermission) {
  const auth = await requirePlatformApiAccess(permission);
  if (auth.response) return auth;

  const featureResponse = requirePlatformFeature(feature);
  if (featureResponse) return { response: featureResponse, user: auth.user };

  return auth;
}

export function requireCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  if (headerSecret !== expected && bearer !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
