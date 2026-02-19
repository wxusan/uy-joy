import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
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
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.nameTranslations !== undefined) data.nameTranslations = body.nameTranslations || null;
  if (body.description !== undefined) data.description = body.description;
  if (body.descriptionTranslations !== undefined) data.descriptionTranslations = body.descriptionTranslations || null;
  if (body.address !== undefined) data.address = body.address;
  if (body.addressTranslations !== undefined) data.addressTranslations = body.addressTranslations || null;
  if (body.topViewImage !== undefined) data.topViewImage = body.topViewImage;
  if (body.latitude !== undefined) data.latitude = body.latitude;
  if (body.longitude !== undefined) data.longitude = body.longitude;
  if (body.infrastructure !== undefined) data.infrastructure = body.infrastructure;

  const project = await prisma.project.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(project);
}
