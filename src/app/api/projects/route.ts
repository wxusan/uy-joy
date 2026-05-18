import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publicProjectSelect } from "@/lib/public-selects";
import { ProjectCreateSchema } from "@/lib/schemas/project";
import { invalidInput } from "@/lib/schemas/common";

export async function GET() {
  const projects = await prisma.project.findMany({
    select: publicProjectSelect,
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
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
