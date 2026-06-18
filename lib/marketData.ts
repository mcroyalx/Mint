export interface ChannelTDA {
  id: string;
  handle: string;
  channelName: string;
  category: string;
  subscribers: string;
  subscriberCount: number;
  monthlyRevenue: number;
  valuation: number;
  tdaProgress: number; // 0 to 100
  countdownHours: number;
  tdaEndTime?: number; // timestamp in milliseconds when TDA ends
  sharePrice: number;
  priceChange24h: number; // percentage e.g. 5.6
  floatPercent: number; // float %
  founderOwnershipPercent: number;
  holdersCount: number;
  yieldPercent: number;
  isCustomTDA?: boolean;
  totalShares?: number;
  avatarUrl?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  viewsPerPost?: string;
  channelAge?: string;
  netProfitPercent?: number; // E.g., 70 for 70%
  founder?: string;
}

export interface PortfolioHolding {
  channelId: string;
  sharesOwned: number;
  avgBuyPrice: number;
  rewardsEarned: number;
}

export interface ActivityLog {
  id: string;
  type: 'BUY' | 'SELL' | 'TDA_LAUNCH' | 'DIVIDEND_PAYOUT';
  channelName: string;
  details: string;
  timestamp: string;
  amountTON: number;
}

export const INITIAL_CHANNELS: ChannelTDA[] = [];

export const INITIAL_HOLDINGS: PortfolioHolding[] = [];

export const INITIAL_ACTIVITY: ActivityLog[] = [];
