import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import prisma from "./prisma";
import {
  attachProjectDisplayNumbers,
  publicBuildingSelect,
  publicFloorSelect,
  publicProjectSelect,
  publicUnitSelect,
} from "./public-selects";

/** Read the tenant id injected by middleware, or fall back to "default". */
async function getTenantId(): Promise<string> {
  try {
    const headerStore = await headers();
    return headerStore.get("x-tenant-id") ?? "default";
  } catch {
    return "default";
  }
}

// Cache project data for 60 seconds (matches ISR revalidation)
// Cache key includes tenantId so multiple tenants never share a cached response.
export async function getCachedProject() {
  const tenantId = await getTenantId();
  return unstable_cache(
    async (tid: string) => {
      if (tid !== "default") {
        const project = await prisma.project.findUnique({
          where: { id: tid },
          select: publicProjectSelect,
        });
        return attachProjectDisplayNumbers(project);
      }
      const project = await prisma.project.findFirst({ select: publicProjectSelect });
      return attachProjectDisplayNumbers(project);
    },
    ["project-with-units", tenantId],
    { revalidate: 60, tags: ["project"] }
  )(tenantId);
}

// Cache project with only polygon units (for apartments page)
export async function getCachedProjectWithPolygonUnits() {
  const tenantId = await getTenantId();
  return unstable_cache(
    async (tid: string) => {
      const where = tid !== "default" ? { id: tid } : undefined;
      const findArgs = {
        select: {
          ...publicProjectSelect,
          buildings: {
            select: {
              ...publicBuildingSelect,
              floors: {
                select: {
                  ...publicFloorSelect,
                  units: {
                    where: {
                      polygonData: { not: Prisma.DbNull },
                    },
                    select: publicUnitSelect,
                  },
                },
                orderBy: { number: "asc" as const },
              },
            },
          },
        },
      };

      if (where) {
        const project = await prisma.project.findUnique({ where, ...findArgs });
        return attachProjectDisplayNumbers(project);
      }
      const project = await prisma.project.findFirst(findArgs);
      return attachProjectDisplayNumbers(project);
    },
    ["project-with-polygon-units", tenantId],
    { revalidate: 60, tags: ["project"] }
  )(tenantId);
}

// Cache hero images
export const getCachedHeroImages = unstable_cache(
  async () => {
    return prisma.heroImage.findMany({
      orderBy: { sortOrder: "asc" },
    });
  },
  ["hero-images"],
  { revalidate: 60, tags: ["hero-images"] }
);

// Cache FAQs
export const getCachedFAQs = unstable_cache(
  async () => {
    return prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  },
  ["faqs"],
  { revalidate: 60, tags: ["faqs"] }
);
