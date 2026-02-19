import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { promises as fs } from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, floorCount } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    if (!floorCount || floorCount < 1) {
      return NextResponse.json({ error: "Floor count is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    // Convert local image to base64
    let base64Data: string;
    let mimeType: string;
    
    if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("uploads/")) {
      // Local file - read and convert to base64
      const imagePath = path.join(process.cwd(), "public", imageUrl);
      const imageBuffer = await fs.readFile(imagePath);
      base64Data = imageBuffer.toString("base64");
      mimeType = imageUrl.endsWith(".png") ? "image/png" : "image/jpeg";
    } else {
      // External URL - fetch and convert
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
      mimeType = response.headers.get("content-type") || "image/jpeg";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert at analyzing building facade images to identify floor boundaries.
This is a building facade image with ${floorCount} floors.
Identify the vertical boundaries (Y positions as percentages) for each floor.
Floor 1 is at the BOTTOM, floor ${floorCount} is at the TOP.

Return a JSON array like this (from top floor to bottom floor):
[
  {"floorNumber": ${floorCount}, "yStart": 5, "yEnd": 15},
  {"floorNumber": ${floorCount - 1}, "yStart": 15, "yEnd": 25},
  ...
  {"floorNumber": 1, "yStart": 85, "yEnd": 95}
]

IMPORTANT:
- yStart is the TOP of the floor (smaller number)
- yEnd is the BOTTOM of the floor (larger number)
- Values are percentages (0-100) of image height
- Leave some margin at top (roof) and bottom (ground)
- Return ONLY the JSON array, no other text`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    const content = result.response.text();
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response
    let floors;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      floors = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: content },
        { status: 500 }
      );
    }

    // Validate and format the response
    const validatedFloors = floors.map((floor: { floorNumber: number; yStart: number; yEnd: number }) => ({
      floorNumber: floor.floorNumber,
      yStart: Math.max(0, Math.min(100, floor.yStart)),
      yEnd: Math.max(0, Math.min(100, floor.yEnd)),
    }));

    return NextResponse.json({ floors: validatedFloors });
  } catch (error) {
    console.error("Error detecting floors:", error);
    return NextResponse.json(
      { error: "Failed to detect floors" },
      { status: 500 }
    );
  }
}
