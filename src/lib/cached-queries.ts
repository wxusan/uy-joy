import { unstable_cache } from "next/cache";
import prisma from "./prisma";

// Cache project data for 60 seconds (matches ISR revalidation)
export const getCachedProject = unstable_cache(
  async () => {
    return prisma.project.findFirst({
      include: {
        buildings: {
          include: {
            floors: {
              include: { units: true },
              orderBy: { number: "asc" },
            },
          },
        },
      },
    });
  },
  ["project-with-units"],
  { revalidate: 60, tags: ["project"] }
);

// Cache project with only polygon units (for apartments page)
export const getCachedProjectWithPolygonUnits = unstable_cache(
  async () => {
    return prisma.project.findFirst({
      include: {
        buildings: {
          include: {
            floors: {
              include: {
                units: {
                  where: {
                    polygonData: { not: null },
                  },
                },
              },
              orderBy: { number: "asc" },
            },
          },
        },
      },
    });
  },
  ["project-with-polygon-units"],
  { revalidate: 60, tags: ["project"] }
);

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
