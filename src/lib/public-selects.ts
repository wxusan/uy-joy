import { Prisma } from "@prisma/client";
import { computeDisplayNumber } from "@/lib/unit-display";

export const publicUnitSelect = {
  id: true,
  unitNumber: true,
  floorId: true,
  rooms: true,
  area: true,
  status: true,
  pricePerM2: true,
  totalPrice: true,
  polygonData: true,
  labelX: true,
  labelY: true,
  sketchImage: true,
  sketchImage2: true,
  sketchImage3: true,
  sketchImage4: true,
  description: true,
  descriptionTranslations: true,
  features: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UnitSelect;

export const publicFloorSelect = {
  id: true,
  number: true,
  buildingId: true,
  basePricePerM2: true,
  floorPlanImage: true,
  positionData: true,
  createdAt: true,
  units: {
    select: publicUnitSelect,
  },
} satisfies Prisma.FloorSelect;

export const publicBuildingSelect = {
  id: true,
  name: true,
  nameTranslations: true,
  projectId: true,
  frontViewImage: true,
  backViewImage: true,
  leftViewImage: true,
  rightViewImage: true,
  polygonData: true,
  labelX: true,
  labelY: true,
  pointX: true,
  pointY: true,
  labelScale: true,
  sortOrder: true,
  createdAt: true,
  floors: {
    select: publicFloorSelect,
    orderBy: { number: "asc" },
  },
} satisfies Prisma.BuildingSelect;

export const publicProjectSelect = {
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
  // Tenant / contact settings
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
  buildings: {
    select: publicBuildingSelect,
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.ProjectSelect;

export const publicUnitWithLocationSelect = {
  ...publicUnitSelect,
  floor: {
    select: {
      id: true,
      number: true,
      basePricePerM2: true,
      floorPlanImage: true,
      building: {
        select: {
          id: true,
          name: true,
          nameTranslations: true,
          projectId: true,
        },
      },
    },
  },
} satisfies Prisma.UnitSelect;

export type PublicProjectPayload = Prisma.ProjectGetPayload<{ select: typeof publicProjectSelect }>;
export type PublicUnitWithLocationPayload = Prisma.UnitGetPayload<{ select: typeof publicUnitWithLocationSelect }>;

export function attachProjectDisplayNumbers<T extends PublicProjectPayload | null>(project: T) {
  if (!project) return project;

  return {
    ...project,
    buildings: project.buildings.map((building) => ({
      ...building,
      floors: building.floors.map((floor) => ({
        ...floor,
        units: floor.units.map((unit) => ({
          ...unit,
          displayNumber: computeDisplayNumber(unit.unitNumber, floor.number),
        })),
      })),
    })),
  };
}

export function attachUnitDisplayNumber<T extends PublicUnitWithLocationPayload>(unit: T) {
  return {
    ...unit,
    displayNumber: computeDisplayNumber(unit.unitNumber, unit.floor.number),
  };
}
