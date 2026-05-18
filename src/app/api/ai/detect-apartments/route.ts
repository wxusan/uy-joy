import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ImageInputError, readSafeImageInput } from "@/lib/secure-image-input";
import { DetectApartmentsSchema } from "@/lib/schemas/ai";
import { invalidInput } from "@/lib/schemas/common";

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

export async function POST(req: Request) {
  const body = await req.json();
  const parsedInput = DetectApartmentsSchema.safeParse(body);
  if (!parsedInput.success) return invalidInput(parsedInput.error);
  const { imageUrl } = parsedInput.data;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured. Please add GEMINI_API_KEY to your .env file." },
      { status: 500 }
    );
  }

  try {
    const { base64, mimeType } = await readSafeImageInput(imageUrl);
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
    if (error instanceof ImageInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("AI detection error:", error);
    return NextResponse.json(
      { error: "AI detection failed. Please try again." },
      { status: 500 }
    );
  }
}
