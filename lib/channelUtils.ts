import type { ChannelTDA } from "./marketData";

const DEFAULT_TOTAL_SHARES = 100000;
const DEFAULT_FLOAT_PERCENT = 30;

/**
 * Compute the float share metrics for a channel, reusing the same defaults everywhere.
 */
export function getFloatMetrics(channel: Pick<ChannelTDA, "totalShares" | "floatPercent" | "tdaProgress">) {
  const totalShares = channel.totalShares || DEFAULT_TOTAL_SHARES;
  const floatFraction = (channel.floatPercent || DEFAULT_FLOAT_PERCENT) / 100;
  const totalFloatShares = totalShares * floatFraction;
  const currentSoldSoft = totalFloatShares * (channel.tdaProgress / 100);
  return { totalShares, floatFraction, totalFloatShares, currentSoldSoft };
}
