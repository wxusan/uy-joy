import { NextResponse } from "next/server";
import { z } from "zod";

export const PointSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const PolygonSchema = z.array(PointSchema).min(3);

export const OptionalUrlString = z.string().trim().min(1).nullable();

export function invalidInput(error: z.ZodError) {
  return NextResponse.json(
    { error: "Invalid input", details: error.flatten() },
    { status: 400 }
  );
}
