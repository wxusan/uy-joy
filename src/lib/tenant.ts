/**
 * Tenant resolution for multi-tenancy support.
 *
 * Step 3.1: getCurrentTenant() uses findFirst() — returns the first (only) project.
 * Step 3.2: upgraded to resolve by x-tenant-id header set in middleware.
 */
import { headers } from "next/headers";
import prisma from "./prisma";

/** All tenant-facing fields returned by getCurrentTenant() */
export type Tenant = {
  id: string;
  slug: string | null;
  domain: string | null;
  name: string;
  nameTranslations: string | null;
  description: string | null;
  descriptionTranslations: string | null;
  address: string | null;
  addressTranslations: string | null;
  coverImage: string | null;
  topViewImage: string | null;
  latitude: number | null;
  longitude: number | null;
  infrastructure: unknown;
  expectedYear: number | null;
  phoneNumber: string | null;
  telegramUrl: string | null;
  instagramUrl: string | null;
  salesOfficeAddress: string | null;
  salesHoursStart: string | null;
  salesHoursEnd: string | null;
  salesDaysJson: string | null;
  masterPlanImage: string | null;
  brandLogo: string | null;
  createdAt: Date;
};

const tenantSelect = {
  id: true,
  slug: true,
  domain: true,
  name: true,
  nameTranslations: true,
  description: true,
  descriptionTranslations: true,
  address: true,
  addressTranslations: true,
  coverImage: true,
  topViewImage: true,
  latitude: true,
  longitude: true,
  infrastructure: true,
  expectedYear: true,
  phoneNumber: true,
  telegramUrl: true,
  instagramUrl: true,
  salesOfficeAddress: true,
  salesHoursStart: true,
  salesHoursEnd: true,
  salesDaysJson: true,
  masterPlanImage: true,
  brandLogo: true,
  createdAt: true,
} as const;

/**
 * Returns the current tenant project.
 *
 * Resolution order:
 * 1. Read the `x-tenant-id` header injected by middleware (set by domain match).
 * 2. Fall back to the first project in the database (single-tenant default).
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
  try {
    const headerStore = await headers();
    const tenantId = headerStore.get("x-tenant-id");

    if (tenantId) {
      const project = await prisma.project.findUnique({
        where: { id: tenantId },
        select: tenantSelect,
      });
      if (project) return project as Tenant;
    }
  } catch {
    // headers() throws outside of a request context (e.g. build time) — fall through
  }

  // Default: return the first project (single-tenant / dev mode)
  return prisma.project.findFirst({ select: tenantSelect }) as Promise<Tenant | null>;
}
