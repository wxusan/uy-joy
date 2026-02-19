import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFile } from "fs/promises";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface Point {
  x: number;
  y: number;
}

interface DetectedApartment {
  polygon: Point[];
  suggestedRooms: number;
  suggestedArea: number;
}

// Get image as base64 and mime type
async function getImageData(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  if (imageUrl.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", imageUrl);
    const fileBuffer = await readFile(filePath);
    const base64 = fileBuffer.toString("base64");
    const ext = path.extname(imageUrl).slice(1).toLowerCase();
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return { base64, mimeType };
  }
  // External URL - fetch and convert
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = response.headers.get("content-type") || "image/jpeg";
  return { base64, mimeType };
}

export async function POST(req: Request) {
  const { imageUrl } = await req.json();

  if (!imageUrl) {
    return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured. Please add GEMINI_API_KEY to your .env file." },
      { status: 500 }
    );
  }

  try {
    const { base64, mimeType } = await getImageData(imageUrl);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert at analyzing architectural floor plans. 
Analyze this floor plan image and identify individual apartments/units. Return their boundaries as polygon coordinates.

Return ONLY valid JSON in this exact format:
{
  "apartments": [
    {
      "polygon": [{"x": 10, "y": 20}, {"x": 30, "y": 20}, {"x": 30, "y": 50}, {"x": 10, "y": 50}],
      "suggestedRooms": 2,
      "suggestedArea": 65
    }
  ]
}

Rules:
- Coordinates are percentages (0-100) relative to image dimensions
- Each polygon must have at least 3 points
- Identify separate apartments by their boundaries (walls, doors)
- suggestedRooms is the number of rooms you estimate in the apartment
- suggestedArea is your estimate in square meters
- If you cannot detect apartments clearly, return {"apartments": []}
- DO NOT include any text outside the JSON`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType: mimeType,
        },
      },
    ]);

    const content = result.response.text();

    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response
    let parsed: { apartments: DetectedApartment[] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (!parsed.apartments || !Array.isArray(parsed.apartments)) {
      return NextResponse.json({ apartments: [] });
    }

    // Validate each apartment
    const validApartments = parsed.apartments.filter((apt) => {
      if (!apt.polygon || !Array.isArray(apt.polygon) || apt.polygon.length < 3) {
        return false;
      }
      return apt.polygon.every(
        (point) =>
          typeof point.x === "number" &&
          typeof point.y === "number" &&
          point.x >= 0 &&
          point.x <= 100 &&
          point.y >= 0 &&
          point.y <= 100
      );
    });

    return NextResponse.json({ apartments: validApartments });
  } catch (error) {
    console.error("AI detection error:", error);
    return NextResponse.json(
      { error: "AI detection failed. Please try again." },
      { status: 500 }
    );
  }
}
