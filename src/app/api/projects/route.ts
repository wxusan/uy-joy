import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publicProjectSelect } from "@/lib/public-selects";
import { ProjectCreateSchema } from "@/lib/schemas/project";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature, requirePlatformFeature } from "@/lib/platform-guards";

export async function GET() {
  const featureResponse = requirePlatformFeature("publicPage");
  if (featureResponse) return featureResponse;

  const projects = await prisma.project.findMany({
    select: publicProjectSelect,
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const guard = await requirePlatformApiFeature("publicPage", "managePublicContent");
  if (guard.response) return guard.response;

  const body = await req.json();
  const parsed = ProjectCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      address: input.address,
      coverImage: input.coverImage,
    },
  });
  return NextResponse.json(project);
}
