import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { generateFallbackValuation } from "@/lib/server/valuation";

/**
 * Lazily constructs a Gemini client from the GEMINI_API_KEY environment
 * variable. Returns null when the key is absent so callers can fall back to the
 * deterministic mock valuation instead of crashing.
 */
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  let handle = "durov_news";
  try {
    const body = await req.json().catch(() => ({}));
    handle = body?.channelHandle?.trim().replace(/^@/, "") || "durov_news";

    const ai = getGeminiClient();
    if (!ai) {
      // No API key configured: return the deterministic mock prospectus.
      return NextResponse.json({
        ...generateFallbackValuation(handle),
        isInteractiveMock: true,
      });
    }

    const prompt = `Analyze the Telegram channel handle '@${handle}' to prepare a high-fidelity Web3 media TDA equity evaluation. 
Evaluate its category, approximate global status, potential real subscriber count, current month-over-month monetized ad revenue inside the Telegram/TON ecosystems, and its aggregate financial valuation. 
Provide a premium investor prospectus structured in 3 clear high-impact sentences detailing revenue sharing, target valuation milestones, and content scaling strategy.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["handle", "channelName", "subscriberCount", "monthlyRevenue_USD", "suggestedValuation_USD", "category", "brandingRating", "prospectusPoints", "yieldPercent", "floatPercent"],
          properties: {
            handle: { type: Type.STRING },
            channelName: { type: Type.STRING },
            subscriberCount: { type: Type.INTEGER, description: "Total subscriber count, e.g. 500000" },
            monthlyRevenue_USD: { type: Type.INTEGER, description: "Monthly ad and stars revenue in USD, e.g. 15000" },
            suggestedValuation_USD: { type: Type.INTEGER, description: "Calculated equity valuation based on 10x-24x monthly revenue, e.g. 240000" },
            category: { type: Type.STRING, description: "Channel niche, e.g., VC & Startups, AI & Tech, Crypto Alerts, Lifestyle" },
            brandingRating: { type: Type.STRING, description: "Rating score e.g. AAA, AA+, AA, A" },
            prospectusPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 3 comprehensive financial prospectus projection bullet points",
            },
            yieldPercent: { type: Type.NUMBER, description: "Annualized dividend/yield share percent, e.g. 8.4" },
            floatPercent: { type: Type.INTEGER, description: "Target public float percentage, e.g. 30" },
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text response received from Gemini.");
    }

    return NextResponse.json(JSON.parse(text.trim()));
  } catch (error) {
    console.error("Gemini TDA Analysis API Error:", error);
    // Graceful fallback so the client never crashes.
    return NextResponse.json({
      ...generateFallbackValuation(handle),
      isInteractiveMock: true,
    });
  }
}
