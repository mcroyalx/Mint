import { generateFallbackResponse } from "@/app/api/gemini/route";

describe("generateFallbackResponse", () => {
  it("returns durov-specific data for handles containing 'durov'", () => {
    const result = generateFallbackResponse("durov_news");
    expect(result.channelName).toBe("Durov's Channel");
    expect(result.category).toBe("Founder Tech News");
    expect(result.subscriberCount).toBe(2_500_000);
    expect(result.brandingRating).toBe("AAA");
    expect(result.yieldPercent).toBe(10.2);
  });

  it("returns entertainment data for meme channels", () => {
    const result = generateFallbackResponse("meme_lords");
    expect(result.category).toBe("Digital Entertainment");
    expect(result.subscriberCount).toBe(1_800_000);
    expect(result.brandingRating).toBe("A-");
  });

  it("returns crypto data for crypto/ton/coin handles", () => {
    const tonResult = generateFallbackResponse("ton_daily");
    expect(tonResult.category).toBe("TON Capital Markets");
    expect(tonResult.subscriberCount).toBe(650_000);

    const cryptoResult = generateFallbackResponse("crypto_signals");
    expect(cryptoResult.category).toBe("TON Capital Markets");
  });

  it("returns AI & Research data for tech/ai handles", () => {
    const result = generateFallbackResponse("ai_frontier");
    expect(result.category).toBe("AI & Research Node");
    expect(result.subscriberCount).toBe(320_000);
  });

  it("uses default AI & Tech Ventures for unmatched handles", () => {
    const result = generateFallbackResponse("random_channel");
    expect(result.category).toBe("AI & Tech Ventures");
    expect(result.subscriberCount).toBe(420_000);
    expect(result.monthlyRevenue_USD).toBe(18_400);
  });

  it("calculates valuation as 18x monthly revenue", () => {
    const result = generateFallbackResponse("some_handle");
    expect(result.suggestedValuation_USD).toBe(result.monthlyRevenue_USD * 18);
  });

  it("always returns floatPercent of 30", () => {
    expect(generateFallbackResponse("a").floatPercent).toBe(30);
    expect(generateFallbackResponse("durov").floatPercent).toBe(30);
  });

  it("returns exactly 3 prospectus points", () => {
    const result = generateFallbackResponse("test");
    expect(result.prospectusPoints).toHaveLength(3);
    result.prospectusPoints.forEach((point: string) => {
      expect(typeof point).toBe("string");
      expect(point.length).toBeGreaterThan(0);
    });
  });

  it("title-cases the handle for channelName when no special match", () => {
    const result = generateFallbackResponse("my_cool_channel");
    expect(result.channelName).toBe("My Cool Channel");
  });

  it("preserves the original handle string", () => {
    const result = generateFallbackResponse("Durov_News");
    expect(result.handle).toBe("Durov_News");
  });
});
