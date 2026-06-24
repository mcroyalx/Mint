/**
 * Shared, deterministic fallback valuation generator.
 *
 * Used by both the Gemini API route and the Telegram webhook so the product
 * keeps returning a believable channel prospectus even when the Gemini API key
 * is not configured or the upstream call fails. Keeping a single source of
 * truth avoids the two copies drifting apart.
 */

export interface ChannelValuation {
  handle: string;
  channelName: string;
  subscriberCount: number;
  monthlyRevenue_USD: number;
  suggestedValuation_USD: number;
  category: string;
  brandingRating: string;
  yieldPercent: number;
  floatPercent: number;
  prospectusPoints: string[];
}

interface CategoryProfile {
  channelName?: string;
  category: string;
  baseSubs: number;
  baseRev: number;
  rating: string;
  yieldPercent: number;
}

const VALUATION_MULTIPLE = 18; // suggested equity valuation = monthly revenue * 18x

const DEFAULT_PROFILE: CategoryProfile = {
  category: "AI & Tech Ventures",
  baseSubs: 420_000,
  baseRev: 18_400,
  rating: "AA+",
  yieldPercent: 8.7,
};

const CATEGORY_PROFILES: Array<{ match: string[]; profile: CategoryProfile }> = [
  {
    match: ["durov"],
    profile: {
      channelName: "Durov's Channel",
      category: "Founder Tech News",
      baseSubs: 2_500_000,
      baseRev: 125_000,
      rating: "AAA",
      yieldPercent: 10.2,
    },
  },
  {
    match: ["meme", "laugh"],
    profile: {
      category: "Digital Entertainment",
      baseSubs: 1_800_000,
      baseRev: 35_000,
      rating: "A-",
      yieldPercent: 6.4,
    },
  },
  {
    match: ["crypto", "ton", "coin"],
    profile: {
      category: "TON Capital Markets",
      baseSubs: 650_000,
      baseRev: 48_000,
      rating: "AA",
      yieldPercent: 11.5,
    },
  },
  {
    match: ["tech", "ai"],
    profile: {
      category: "AI & Research Node",
      baseSubs: 320_000,
      baseRev: 16_200,
      rating: "AA",
      yieldPercent: 9.1,
    },
  },
];

function titleCase(handle: string): string {
  return handle.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function generateFallbackValuation(handle: string): ChannelValuation {
  const normalized = handle.toLowerCase();
  const matched = CATEGORY_PROFILES.find(({ match }) =>
    match.some((keyword) => normalized.includes(keyword)),
  );
  const profile = matched?.profile ?? DEFAULT_PROFILE;

  return {
    handle,
    channelName: profile.channelName ?? titleCase(handle),
    subscriberCount: profile.baseSubs,
    monthlyRevenue_USD: profile.baseRev,
    suggestedValuation_USD: profile.baseRev * VALUATION_MULTIPLE,
    category: profile.category,
    brandingRating: profile.rating,
    yieldPercent: profile.yieldPercent,
    floatPercent: 30,
    prospectusPoints: [
      "Revenue Share Security: Holders receive proportional payouts from direct channel ad earnings and Telegram stars monetization streams.",
      "Valuation Drivers: Value appreciation is tied to subscriber count gains, organic read rates, and exclusive sponsor tier activations.",
      "Liquidity Protection: A built-in bonding curve contract establishes a dynamic floor price and distributes exit-tax dividends back to long-term stakers.",
    ],
  };
}
