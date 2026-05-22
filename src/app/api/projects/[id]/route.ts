import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publicProjectSelect } from "@/lib/public-selects";
import { invalidateProject } from "@/lib/cache";
import { ProjectUpdateSchema } from "@/lib/schemas/project";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature, requirePlatformFeature } from "@/lib/platform-guards";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const featureResponse = requirePlatformFeature("publicPage");
  if (featureResponse) return featureResponse;

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: publicProjectSelect,
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requirePlatformApiFeature("publicPage", "managePublicContent");
  if (guard.response) return guard.response;

  const body = await req.json();
  const parsed = ProjectUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.nameTranslations !== undefined) data.nameTranslations = input.nameTranslations || null;
  if (input.description !== undefined) data.description = input.description;
  if (input.descriptionTranslations !== undefined) data.descriptionTranslations = input.descriptionTranslations || null;
  if (input.address !== undefined) data.address = input.address;
  if (input.addressTranslations !== undefined) data.addressTranslations = input.addressTranslations || null;
  if (input.topViewImage !== undefined) data.topViewImage = input.topViewImage;
  if (input.latitude !== undefined) data.latitude = input.latitude;
  if (input.longitude !== undefined) data.longitude = input.longitude;
  if (input.infrastructure !== undefined) data.infrastructure = input.infrastructure;
  if (input.expectedYear !== undefined) data.expectedYear = input.expectedYear;

  const project = await prisma.project.update({
    where: { id: params.id },
    data,
  });
  invalidateProject();
  return NextResponse.json(project);
}
