import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { text, existingTranslations, context } = await request.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    // Build context about existing translations
    const existingInfo = existingTranslations 
      ? Object.entries(existingTranslations)
          .filter(([, value]) => value)
          .map(([lang, value]) => `${lang}: "${value}"`)
          .join("\n")
      : "";

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a professional translator specializing in real estate and property content.
Translate the following text into Uzbek (uz), Russian (ru), and English (en).
The translations should be natural, culturally appropriate, and maintain the original meaning.
For real estate terms, use the common terminology used in each language.

${context ? `Context: This is for ${context}` : ""}

Text to translate: "${text}"

${existingInfo ? `Existing translations for reference:\n${existingInfo}` : ""}

Return ONLY a valid JSON object with translations, no other text:
{"uz": "Uzbek translation", "ru": "Russian translation", "en": "English translation"}`;

    let content: string | null = null;

    // Primary: SDK
    try {
      const result = await model.generateContent(prompt);
      content = result.response.text();
    } catch (e) {
      console.error("Gemini SDK error, will try REST fallback:", e);
    }

    // Fallback: REST API
    if (!content) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          console.error("Gemini REST error:", json);
          return NextResponse.json({ error: "Gemini REST error", detail: json?.error?.message || JSON.stringify(json) }, { status: 500 });
        }
        content = json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      } catch (e: any) {
        console.error("Gemini REST fetch failed:", e);
        return NextResponse.json({ error: "Failed to call Gemini REST", detail: e?.message || String(e) }, { status: 500 });
      }
    }

    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response
    let translations;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in response");
      }
      translations = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: content },
        { status: 500 }
      );
    }

    // Validate the response has all required languages
    const validatedTranslations = {
      uz: translations.uz || "",
      ru: translations.ru || "",
      en: translations.en || "",
    };

    return NextResponse.json({ translations: validatedTranslations });
  } catch (error: any) {
    console.error("Error translating:", error);
    const detail = typeof error?.message === "string" ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to translate", detail },
      { status: 500 }
    );
  }
}
