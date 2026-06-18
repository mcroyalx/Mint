import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Dynamic initialization helper to avoid crash on startup if key is missing
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelHandle } = body;

    const handle = channelHandle?.trim().replace(/^@/, "") || "durov_news";

    const ai = getGeminiClient();

    if (!ai) {
      // Return a premium mock response that looks exceptionally authentic
      const fallbackData = generateFallbackResponse(handle);
      return NextResponse.json({ ...fallbackData, isInteractiveMock: true });
    }

    const prompt = `Analyze the Telegram channel handle '@${handle}' to prepare a high-fidelity Web3 media TDA equity evaluation. 
Evaluate its category, approximate global status, potential real subscriber count, current month-over-month monetized ad revenue inside the Telegram/TON ecosystems, and its aggregate financial valuation. 
Provide a premium investor prospectus structured in 3 clear high-impact sentences detailing revenue sharing, target valuation milestones, and content scaling strategy.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
              description: "Array of exactly 3 comprehensive financial prospectus projection bullet points"
            },
            yieldPercent: { type: Type.NUMBER, description: "Annualized dividend/yield share percent, e.g. 8.4" },
            floatPercent: { type: Type.INTEGER, description: "Target public float percentage, e.g. 30" }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text response received from Gemini.");
    }

    const data = JSON.parse(text.trim());
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Gemini TDA Analysis API Error:", error);
    // Graceful fallback so the client never crashes
    const fallbackData = generateFallbackResponse("fallback");
    return NextResponse.json({ ...fallbackData, error: error.message, isInteractiveMock: true });
  }
}

function generateFallbackResponse(handle: string) {
  const normalized = handle.toLowerCase();
  
  // Custom generation based on the string value to feel extremely authentic
  let channelName = handle.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  let category = "AI & Tech Ventures";
  let baseSubs = 420000;
  let baseRev = 18400;
  let rating = "AA+";
  let yieldPercent = 8.7;
  
  if (normalized.includes("durov")) {
    channelName = "Durov's Channel";
    category = "Founder Tech News";
    baseSubs = 2500000;
    baseRev = 125000;
    rating = "AAA";
    yieldPercent = 10.2;
  } else if (normalized.includes("meme") || normalized.includes("laugh")) {
    category = "Digital Entertainment";
    baseSubs = 1800000;
    baseRev = 35000;
    rating = "A-";
    yieldPercent = 6.4;
  } else if (normalized.includes("crypto") || normalized.includes("ton") || normalized.includes("coin")) {
    category = "TON Capital Markets";
    baseSubs = 650000;
    baseRev = 48000;
    rating = "AA";
    yieldPercent = 11.5;
  } else if (normalized.includes("tech") || normalized.includes("ai")) {
    category = "AI & Research Node";
    baseSubs = 320000;
    baseRev = 16200;
    rating = "AA";
    yieldPercent = 9.1;
  }

  const suggestedValuation = baseRev * 18; // 18x multiple

  return {
    handle: handle,
    channelName: channelName,
    subscriberCount: baseSubs,
    monthlyRevenue_USD: baseRev,
    suggestedValuation_USD: suggestedValuation,
    category: category,
    brandingRating: rating,
    yieldPercent: yieldPercent,
    floatPercent: 30,
    prospectusPoints: [
      `Revenue Share Security: Holders receive proportional payouts from direct channel ad earnings and Telegram stars monetization streams.`,
      `Valuation Drivers: Value appreciation is tied to subscriber count gains, organic read rates, and exclusive sponsor tier activations.`,
      `Liquidity Protection: A built-in bonding curve contract establishes a dynamic floor price and distributes exit-tax dividends back to long-term stakers.`
    ]
  };
}
