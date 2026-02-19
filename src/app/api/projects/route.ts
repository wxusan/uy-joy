import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.project.findMany({
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
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description,
      address: body.address,
      coverImage: body.coverImage,
    },
  });
  return NextResponse.json(project);
}
