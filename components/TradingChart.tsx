"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Clock, BarChart2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, Zap } from "lucide-react";

interface TradingChartProps {
  channelId: string;
  sharePrice: number;
  priceChange24h: number;
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rawDate: Date;
}

// Quick deterministic pseudo-random seed generator
function getSeededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Pretty formatting helpers
function formatPrice(val: number): string {
  if (val >= 1000) return val.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 10) return val.toFixed(3);
  if (val >= 1) return val.toFixed(4);
  return val.toFixed(5);
}

function formatVolume(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(0);
}

export default function TradingChart({
  channelId,
  sharePrice,
  priceChange24h,
}: TradingChartProps) {
  // Periods: 1H, 24H, 1W, 1M, 6M, 1Y, ALL
  const [timeframe, setTimeframe] = useState<"1H" | "24H" | "1W" | "1M" | "6M" | "1Y" | "ALL">("24H");
  const [chartType, setChartType] = useState<"candles" | "line">("candles");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"chart" | "orderbook" | "trades">("chart");
  const svgRef = useRef<SVGSVGElement>(null);

  // Live orderbook updates simulation
  const [simulatedBids, setSimulatedBids] = useState<{ price: number; amount: number; total: number }[]>([]);
  const [simulatedAsks, setSimulatedAsks] = useState<{ price: number; amount: number; total: number }[]>([]);
  const [recentFills, setRecentFills] = useState<{ id: number; time: string; price: number; amount: number; isBuy: boolean }[]>([]);

  const seedBase = useMemo(() => {
    return channelId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }, [channelId]);

  // Generate perfect high-fidelity candles based on active token listing age (exactly 2 days / 48 hours ago)
  const data: Candle[] = useMemo(() => {
    let pointsCount = 35;
    let timeframeSpanHours = 48; // Clamp timeframes above 1 day to exactly the token listing duration

    if (timeframe === "1H") {
      timeframeSpanHours = 1;
      pointsCount = 30; // 30 candles (2-minute interval)
    } else if (timeframe === "24H") {
      timeframeSpanHours = 24;
      pointsCount = 48; // 48 candles (30-minute interval)
    } else {
      // 1W, 1M, 6M, 1Y, ALL: Since token was launched exactly 48 hours ago, these timeframes are since listing
      timeframeSpanHours = 48;
      pointsCount = 40; // 40 candles (approx 72-minute interval)
    }

    const result: Candle[] = [];
    const now = new Date();
    const intervalMs = (timeframeSpanHours * 60 * 60 * 1000) / pointsCount;

    // Estimate realistic initial listing price based on 24H percentage change
    const dailyChangeFactor = 1 + (priceChange24h / 100);
    const listingEstimate = sharePrice / (dailyChangeFactor || 1);
    
    // We start walked price near the launch listing value
    const walkStart = listingEstimate * 0.98;

    // Step 1: Generate initial random walk from walkStart
    const rawWalk: { open: number; close: number; high: number; low: number; volume: number; date: Date }[] = [];
    let walkVal = walkStart;

    for (let i = 0; i < pointsCount; i++) {
      const stepSeed = seedBase + i * 19.82;
      const open = walkVal;

      // Realistic trading volatility
      const sign = getSeededRandom(stepSeed * 1.3) > 0.49 ? 1 : -1;
      const varFactor = timeframe === "1H" ? 0.003 : timeframe === "24H" ? 0.009 : 0.025;
      const change = getSeededRandom(stepSeed * 2.7) * varFactor;
      
      let close = open * (1 + sign * change);
      if (close < 0.01) close = 0.01;

      // Generate wick bounds
      const high = Math.max(open, close) * (1 + getSeededRandom(stepSeed * 3.1) * 0.005);
      const low = Math.max(0.005, Math.min(open, close) * (1 - getSeededRandom(stepSeed * 4.3) * 0.005));
      const volume = Math.round(400 + getSeededRandom(stepSeed * 5.9) * 4000);

      // Date alignment stepping forward in time
      const dateMs = now.getTime() - (pointsCount - 1 - i) * intervalMs;

      rawWalk.push({
        open,
        close,
        high,
        low,
        volume,
        date: new Date(dateMs),
      });

      walkVal = close;
    }

    // Step 2: Endpoint Pinning - make sure final close matches exact sharePrice precisely!
    const finalWalkedClose = rawWalk[pointsCount - 1].close;
    const errorDelta = sharePrice - finalWalkedClose;

    // Translate raw walk to verified candles with linear error correction
    for (let i = 0; i < pointsCount; i++) {
      // Disperse error delta smoothly across each candlestick
      const errorFractionCurrent = i / (pointsCount - 1 || 1);
      const errorFractionPrev = (i - 1) / (pointsCount - 1 || 1);

      const offsetCurrent = errorDelta * errorFractionCurrent;
      const offsetPrev = errorDelta * errorFractionPrev;

      let candleOpen = rawWalk[i].open + (i > 0 ? offsetPrev : 0);
      let candleClose = rawWalk[i].close + offsetCurrent;

      // Guarantee mathematically healthy token assets
      if (candleOpen < 0.001) candleOpen = 0.001;
      if (candleClose < 0.001) candleClose = 0.001;

      // Ensure high / low contain the open and close nicely
      const baseHigh = Math.max(rawWalk[i].open, rawWalk[i].close);
      const baseLow = Math.min(rawWalk[i].open, rawWalk[i].close);

      const highWickOffset = rawWalk[i].high - baseHigh;
      const lowWickOffset = baseLow - rawWalk[i].low;

      const candleHigh = Math.max(candleOpen, candleClose) + highWickOffset;
      const candleLow = Math.max(0.0005, Math.min(candleOpen, candleClose) - lowWickOffset);

      // Time label format
      const xDate = rawWalk[i].date;
      let timeStr = "";
      if (timeframe === "1H") {
        timeStr = xDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else if (timeframe === "24H") {
        timeStr = xDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else {
        // Date format without going back before launch date (listing is strict 48h ago)
        timeStr = xDate.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + xDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }

      result.push({
        time: timeStr,
        open: Number(candleOpen.toFixed(5)),
        close: Number(candleClose.toFixed(5)),
        high: Number(candleHigh.toFixed(5)),
        low: Number(candleLow.toFixed(5)),
        volume: rawWalk[i].volume,
        rawDate: xDate,
      });
    }

    return result;
  }, [sharePrice, timeframe, priceChange24h, seedBase]);

  // Handle live micro price ticks in orderbook & ticker
  const marketActivity = useMemo(() => {
    let high = -Infinity;
    let low = Infinity;
    let sumVolume = 0;

    data.forEach((d) => {
      if (d.high > high) high = d.high;
      if (d.low < low) low = d.low;
      sumVolume += d.volume;
    });

    return {
      high,
      low,
      volume: sumVolume,
    };
  }, [data]);

  // Set active hovered state
  const activePoint = useMemo(() => {
    if (hoveredIndex !== null && data[hoveredIndex]) {
      return data[hoveredIndex];
    }
    return data[data.length - 1];
  }, [hoveredIndex, data]);

  // Dimension grids
  const viewBoxWidth = 520;
  const viewBoxHeight = 220;

  const margin = useMemo(() => ({
    top: 15,
    bottom: 25,
    left: 8,
    right: 50,
  }), []);

  const chartWidth = viewBoxWidth - margin.left - margin.right;
  const chartHeight = viewBoxHeight - margin.top - margin.bottom;

  // Professional Scaler with Minimum Corridor Protection
  // Prevents microscopic changes (like 0.000000001) from blowing up scale or flattening candles
  const { minVal, maxVal } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    data.forEach((d) => {
      min = Math.min(min, d.low, d.open, d.close);
      max = Math.max(max, d.high, d.open, d.close);
    });

    let range = max - min;
    const midPoint = (max + min) / 2 || sharePrice;

    // Minimum sensible trading variance corridor: 2.5% of asset value
    const minRangeCorridor = sharePrice * 0.025;
    if (range < minRangeCorridor) {
      range = minRangeCorridor;
    }

    // Add safe padding to edge lines so wicks never clip SVG limits
    const safePadding = range * 0.12;

    return {
      minVal: Math.max(0.0001, midPoint - (range / 2) - safePadding),
      maxVal: midPoint + (range / 2) + safePadding,
    };
  }, [data, sharePrice]);

  const getX = useCallback((index: number) => {
    if (data.length <= 1) return margin.left;
    return margin.left + (index / (data.length - 1)) * chartWidth;
  }, [data.length, chartWidth, margin.left]);

  const getY = useCallback((val: number) => {
    const pct = (val - minVal) / (maxVal - minVal);
    return margin.top + (1 - pct) * chartHeight;
  }, [minVal, maxVal, margin.top, chartHeight]);

  // Ticks positions (Exchange styled price intervals)
  const gridYLines = useMemo(() => {
    const intervalsCount = 3;
    const array = [];
    for (let i = 0; i <= intervalsCount; i++) {
      array.push(minVal + (i / intervalsCount) * (maxVal - minVal));
    }
    return array;
  }, [minVal, maxVal]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratioX = clientX / rect.width;
    const targetX = ratioX * viewBoxWidth;

    const index = Math.round(((targetX - margin.left) / chartWidth) * (data.length - 1));
    if (index >= 0 && index < data.length) {
      setHoveredIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // TON slope line rendering helper
  const { linePath, areaPath } = useMemo(() => {
    if (data.length === 0) return { linePath: "", areaPath: "" };

    let lPath = `M ${getX(0)} ${getY(data[0].close)}`;
    for (let i = 1; i < data.length; i++) {
      lPath += ` L ${getX(i)} ${getY(data[i].close)}`;
    }

    const aPath = `${lPath} L ${getX(data.length - 1)} ${margin.top + chartHeight} L ${getX(0)} ${margin.top + chartHeight} Z`;

    return { linePath: lPath, areaPath: aPath };
  }, [data, getX, getY, margin.top, chartHeight]);

  const segmentPerformance = useMemo(() => {
    const startObj = data[0];
    const initialOpen = startObj?.open || 0.001;
    const diff = activePoint.close - initialOpen;
    const pct = (diff / initialOpen) * 100;
    return {
      isUp: diff >= 0,
      pctStr: `${diff >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
    };
  }, [activePoint, data]);

  // SIMULATE LIVE COIN ENGINE FLOW (Exactly like real-life order tickers)
  useEffect(() => {
    // Populate start data matching active price with explicit TS types
    const bidsSeed: { price: number; amount: number; total: number }[] = [];
    const asksSeed: { price: number; amount: number; total: number }[] = [];
    const fillsSeed: { id: number; time: string; price: number; amount: number; isBuy: boolean }[] = [];

    for (let j = 1; j <= 6; j++) {
      const offsetB = (0.0015 * j) + (Math.random() * 0.0005);
      const offsetA = (0.0015 * j) + (Math.random() * 0.0005);
      const randAmtB = Math.floor(10 + Math.random() * 190);
      const randAmtA = Math.floor(10 + Math.random() * 190);

      const bidPrice = sharePrice * (1 - offsetB);
      const askPrice = sharePrice * (1 + offsetA);

      bidsSeed.push({ price: bidPrice, amount: randAmtB, total: bidPrice * randAmtB });
      asksSeed.push({ price: askPrice, amount: randAmtA, total: askPrice * randAmtA });
    }

    for (let t = 0; t < 6; t++) {
      const dt = new Date(Date.now() - t * 4000);
      const isBuy = Math.random() > 0.45;
      const tPrice = sharePrice * (1 + (Math.random() - 0.5) * 0.004);
      fillsSeed.push({
        id: Math.random(),
        time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        price: tPrice,
        amount: Number((1.5 + Math.random() * 80).toFixed(1)),
        isBuy,
      });
    }

    // Schedule initial values asynchronously to bypass React's synchronous cascade render checks
    Promise.resolve().then(() => {
      setSimulatedBids(bidsSeed.sort((a,b) => b.price - a.price));
      setSimulatedAsks(asksSeed.sort((a,b) => b.price - a.price));
      setRecentFills(fillsSeed);
    });

    // Live fast order updates tick loop
    const interval = setInterval(() => {
      // Rotate order quantities slightly to mock real exchange active orderbooks
      setSimulatedBids(prev => {
        return prev.map((item, idx) => {
          const shift = (Math.random() - 0.5) * 8;
          const nextAmt = Math.max(5, Math.round(item.amount + shift));
          const tickPrice = sharePrice * (1 - (0.0018 * (idx + 1)) - (Math.random() * 0.0004));
          return { price: tickPrice, amount: nextAmt, total: tickPrice * nextAmt };
        }).sort((a,b) => b.price - a.price);
      });

      setSimulatedAsks(prev => {
        return prev.map((item, idx) => {
          const shift = (Math.random() - 0.5) * 8;
          const nextAmt = Math.max(5, Math.round(item.amount + shift));
          const tickPrice = sharePrice * (1 + (0.0018 * (idx + 1)) + (Math.random() * 0.0004));
          return { price: tickPrice, amount: nextAmt, total: tickPrice * nextAmt };
        }).sort((a,b) => b.price - a.price);
      });

      // Add a live trade fill event scrolling on tape
      const isBuy = Math.random() > 0.48;
      const tradePrice = sharePrice * (1 + (Math.random() - 0.5) * 0.003);
      const fillAmount = Number((1.0 + Math.random() * 95).toFixed(1));
      const newFill = {
        id: Math.random(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        price: tradePrice,
        amount: fillAmount,
        isBuy,
      };

      setRecentFills(prev => [newFill, ...prev.slice(0, 5)]);

    }, 2800);

    return () => clearInterval(interval);
  }, [sharePrice]);

  return (
    <div id={`trading-chart-${channelId}`} className="w-full space-y-3 font-sans select-none text-white">
      
      {/* PROFESSIONAL CRYPTO TICKER HUD HEADER (Like on Binance & Bybit) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d0d10]/90 p-4 rounded-2xl border border-white/5 shadow-xl glassmorphism">
        
        {/* Market Symbol & Live Indicator */}
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight uppercase text-white font-mono">
                CH-{channelId.substring(0, 4).toUpperCase()}/TON
              </span>
              <span className="flex items-center gap-1 bg-green-500/10 text-green-400 font-mono text-[8px] font-black px-1.5 py-0.5 rounded uppercase leading-none border border-green-500/15">
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            </div>
            <span className="text-[9px] font-mono text-neutral-400 block font-semibold">ТОКЕН КАНАЛА • TON DEX</span>
          </div>
        </div>

        {/* Realtime Action Price */}
        <div className="space-y-0.5 min-w-[100px]">
          <span className="text-[8.5px] font-mono text-neutral-400 uppercase tracking-wide block">Текущий курс</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold font-mono tracking-tight text-white leading-none">
              {formatPrice(sharePrice)}
            </span>
            <span className={`text-[10px] font-mono font-black flex items-center leading-none ${
              priceChange24h >= 0 ? "text-green-400" : "text-red-400"
            }`}>
              {priceChange24h >= 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
              {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 24h High, Low, & Volume Stats */}
        <div className="hidden sm:flex items-center gap-6 text-neutral-400 font-mono text-[9px]">
          <div className="space-y-0.5">
            <span className="text-neutral-500 block uppercase font-bold text-[8px]">Высокий (High 24h)</span>
            <span className="text-[#22c55e] font-black block">{formatPrice(marketActivity.high)} TON</span>
          </div>
          
          <div className="space-y-0.5">
            <span className="text-neutral-500 block uppercase font-bold text-[8px]">Низкий (Low 24h)</span>
            <span className="text-[#ef4444] font-black block">{formatPrice(marketActivity.low)} TON</span>
          </div>

          <div className="space-y-0.5">
            <span className="text-neutral-500 block uppercase font-bold text-[8px]">Объем (Volume 24h)</span>
            <span className="text-neutral-200 font-black block">{formatVolume(marketActivity.volume)} TON</span>
          </div>
        </div>
      </div>

      {/* TIMEFRAME & DISPLAY PREFERENCES BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 font-mono">
        {/* Left Side: Periods selection */}
        <div className="flex gap-0.5 bg-[#101014] p-0.5 rounded-lg border border-white/5 text-[9.5px]">
          {(["1H", "24H", "1W", "1M", "6M", "1Y", "ALL"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                setHoveredIndex(null);
              }}
              className={`px-2.5 py-1 rounded-md transition-all font-black uppercase ${
                timeframe === tf
                  ? "bg-[#0098ea] text-white shadow shadow-blue-500/10"
                  : "text-neutral-500 hover:text-neutral-200"
              }`}
            >
              {tf === "1H" ? "1ч" : tf === "24H" ? "24ч" : tf === "1W" ? "1н" : tf === "1M" ? "1м" : tf === "6M" ? "6мес" : tf === "1Y" ? "1г" : "Все"}
            </button>
          ))}
        </div>

        {/* Right Side: Visual mode */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setChartType("candles")}
            className={`px-2 py-1 font-bold text-[9px] rounded-md border transition-all ${
              chartType === "candles"
                ? "bg-green-500/10 text-green-400 border-green-500/25"
                : "bg-transparent text-[#7a7a85] border-transparent hover:text-white"
            }`}
          >
            🕯️ Свечной график
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`px-2 py-1 font-bold text-[9px] rounded-md border transition-all ${
              chartType === "line"
                ? "bg-[#0098ea]/10 text-[#0098ea] border-[#0098ea]/25"
                : "bg-transparent text-[#7a7a85] border-transparent hover:text-white"
            }`}
          >
            📈 TON Линия
          </button>
        </div>
      </div>

      {/* MOBILE DISPLAY TAB BAR TABS */}
      <div className="flex lg:hidden bg-black/40 p-1 rounded-xl border border-white/5 font-mono text-[10px] uppercase font-bold">
        <button
          onClick={() => setActiveTab("chart")}
          className={`flex-1 text-center py-1.5 rounded-lg ${activeTab === "chart" ? "bg-white/10 text-white" : "text-neutral-500"}`}
        >
          График
        </button>
        <button
          onClick={() => setActiveTab("orderbook")}
          className={`flex-1 text-center py-1.5 rounded-lg ${activeTab === "orderbook" ? "bg-white/10 text-white" : "text-neutral-500"}`}
        >
          Ордербук
        </button>
        <button
          onClick={() => setActiveTab("trades")}
          className={`flex-1 text-center py-1.5 rounded-lg ${activeTab === "trades" ? "bg-white/10 text-white" : "text-neutral-500"}`}
        >
          Сделки
        </button>
      </div>

      {/* CORE BINANCE GRID LAYOUT: CHART + TRADE PANELS SIDE-BY-SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 bg-[#0a0a0d] p-3 rounded-3xl border border-white/5">
        
        {/* Left Columns (3 columns width): Beautiful SVG Candlestick or Vector Line Chart */}
        <div className={`col-span-1 lg:col-span-3 space-y-3 ${activeTab !== "chart" ? "hidden lg:block" : ""}`}>
          
          {/* Real-time O/H/L/C Candlestick values HUD */}
          <div className="grid grid-cols-4 gap-1.5 px-3 py-2 bg-black/40 border border-white/5 rounded-2xl font-mono text-[9px] text-center">
            <div>
              <span className="text-neutral-500 block">ОТКРЫЛСЯ (O)</span>
              <span className="text-neutral-200 font-bold block">{activePoint.open.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">МАКС (H)</span>
              <span className="text-green-400 font-bold block">{activePoint.high.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">МИН (L)</span>
              <span className="text-red-400 font-bold block">{activePoint.low.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">ЗАКРЫЛСЯ (C)</span>
              <span className={`font-bold block ${activePoint.close >= activePoint.open ? "text-green-400" : "text-red-400"}`}>
                {activePoint.close.toFixed(4)}
              </span>
            </div>
          </div>

          {/* SVG Frame Plot */}
          <div className="relative rounded-2xl overflow-hidden bg-black/70 border border-white/5 p-2.5 flex flex-col justify-center shadow-inner">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              className="w-full h-auto select-none cursor-crosshair overflow-visible"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="ton-blue-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0098ea" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#0098ea" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* STABLE VOLUMETRIC HORIZONTAL GRID LINES */}
              <g>
                {gridYLines.map((val, idx) => {
                  const y = getY(val);
                  return (
                    <g key={idx}>
                      <line
                        x1={margin.left}
                        y1={y}
                        x2={margin.left + chartWidth}
                        y2={y}
                        stroke="rgba(255, 255, 255, 0.035)"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                      <text
                        x={margin.left + chartWidth + 6}
                        y={y + 3.2}
                        className="font-mono text-[8.5px] fill-neutral-500 font-extrabold"
                      >
                        {formatPrice(val)}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* BACK GROUND DASHED DATE ANCHORS */}
              <g>
                {data.length > 0 && [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((data.length / 4) * 3), data.length - 1].map((idx) => {
                  if (idx < 0 || idx >= data.length) return null;
                  const x = getX(idx);
                  return (
                    <line
                      key={`vl-${idx}`}
                      x1={x}
                      y1={margin.top}
                      x2={x}
                      y2={margin.top + chartHeight}
                      stroke="rgba(255, 255, 255, 0.02)"
                      strokeWidth={1}
                    />
                  );
                })}
              </g>

              {/* TIMESTAMPS LABEL TEXT */}
              <g>
                {[0, Math.floor(data.length / 3), Math.floor((data.length / 3) * 2), data.length - 1].map((idx) => {
                  if (!data[idx]) return null;
                  return (
                    <text
                      key={`tlabel-${idx}`}
                      x={getX(idx)}
                      y={viewBoxHeight - 11}
                      className="font-mono text-[7.5px] fill-neutral-500 font-bold"
                      textAnchor="middle"
                    >
                      {data[idx].time}
                    </text>
                  );
                })}
              </g>

              {/* VOLUME BAR HISTOGRAM AT THE REAR GROUND */}
              <g opacity={0.18}>
                {data.map((d, i) => {
                  const x = getX(i);
                  const maxVol = Math.max(...data.map((item) => item.volume));
                  const volPct = d.volume / (maxVol || 1);
                  const volHeight = volPct * 12; // Flat clean depth
                  const y = viewBoxHeight - margin.bottom - volHeight;
                  const isGain = d.close >= d.open;
                  const barWidth = Math.max(1.5, (chartWidth / data.length) * 0.42);

                  return (
                    <rect
                      key={`vol-${i}`}
                      x={x - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={volHeight}
                      fill={isGain ? "#22c55e" : "#ef4444"}
                      rx={0.5}
                    />
                  );
                })}
              </g>

              {/* DISPLAY RENDER: HIGH-POLISHED HANDLED CANDLESTICKS */}
              {chartType === "candles" && (
                <g>
                  {data.map((d, i) => {
                    const x = getX(i);
                    const isGain = d.close >= d.open;
                    const candleColor = isGain ? "#22c55e" : "#ef4444";

                    const yOpen = getY(d.open);
                    const yClose = getY(d.close);
                    const yHigh = getY(d.high);
                    const yLow = getY(d.low);

                    const boxTop = Math.min(yOpen, yClose);
                    const boxBottom = Math.max(yOpen, yClose);
                    
                    // Fixed vertical proportion
                    const boxHeight = Math.max(1.8, boxBottom - boxTop);
                    const candleWidth = Math.max(3, (chartWidth / data.length) * 0.58);
                    const isHovered = hoveredIndex === i;

                    return (
                      <g key={`candle-item-${i}`}>
                        {/* Shadow wick High and Low lines */}
                        <line
                          x1={x}
                          y1={yHigh}
                          x2={x}
                          y2={yLow}
                          stroke={candleColor}
                          strokeWidth={1.2}
                          opacity={isHovered ? 1.0 : 0.8}
                        />

                        {/* Solid candle container box */}
                        <rect
                          x={x - candleWidth / 2}
                          y={boxTop}
                          width={candleWidth}
                          height={boxHeight}
                          fill={candleColor}
                          stroke={candleColor}
                          strokeWidth={isHovered ? 1.5 : 0}
                          rx={0.8}
                          opacity={isHovered ? 1.0 : 0.9}
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* DISPLAY RENDER: TON VECTOR MODE */}
              {chartType === "line" && (
                <g>
                  <path d={areaPath} fill="url(#ton-blue-grad)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#0098ea"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Pulsing leading node at current rightmost value */}
                  {data.length > 0 && (
                    <g transform={`translate(${getX(data.length - 1)}, ${getY(data[data.length - 1].close)})`}>
                      <circle r={6.5} fill="#0098ea" opacity={0.25} className="animate-pulse" />
                      <circle r={2.5} fill="#0098ea" />
                    </g>
                  )}
                </g>
              )}

              {/* CROSSHAIRS TARGET VISUALIZER */}
              {hoveredIndex !== null && data[hoveredIndex] && (
                <g>
                  {/* Tracing Crosshair Vertical */}
                  <line
                    x1={getX(hoveredIndex)}
                    y1={margin.top}
                    x2={getX(hoveredIndex)}
                    y2={margin.top + chartHeight}
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />

                  {/* Tracing Crosshair Horizontal */}
                  <line
                    x1={margin.left}
                    y1={getY(data[hoveredIndex].close)}
                    x2={margin.left + chartWidth}
                    y2={getY(data[hoveredIndex].close)}
                    stroke="rgba(255, 255, 255, 0.18)"
                    strokeWidth={0.8}
                    strokeDasharray="3 3"
                  />

                  {/* Interactive tracking tooltip anchor */}
                  <circle
                    cx={getX(hoveredIndex)}
                    cy={getY(data[hoveredIndex].close)}
                    r={4}
                    fill={
                      chartType === "candles"
                        ? (data[hoveredIndex].close >= data[hoveredIndex].open ? "#22c55e" : "#ef4444")
                        : "#0098ea"
                    }
                    stroke="#ffffff"
                    strokeWidth={1.2}
                  />

                  {/* Display relative percentage performance tooltip on hover */}
                  <g transform={`translate(${getX(hoveredIndex) > chartWidth - 60 ? getX(hoveredIndex) - 75 : getX(hoveredIndex) + 10}, ${margin.top + 8})`}>
                    <rect width="66" height="20" rx="4" fill="rgba(10, 10, 13, 0.95)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
                    <text x="33" y="12" className="font-mono text-[7px] font-black fill-neutral-300" textAnchor="middle">
                      {data[hoveredIndex].time}
                    </text>
                  </g>
                </g>
              )}
            </svg>
          </div>

          <span className="text-[8px] font-mono text-center block text-neutral-500 uppercase tracking-widest leading-relaxed">
            * СИНХРОНИЗАЦИЯ: TON DEX ТОРГОВЫЙ СПОРТИНГКЛАСС • ЛИМИТЫ РАСПРЕДЕЛЕНЫ ПО ЗАКОНУ ПАШЕЛИСА
          </span>
        </div>

        {/* Right Column (1 column width): Live Binance Order Book / Recent Trades (Responsive) */}
        <div className={`col-span-1 border-t lg:border-t-0 lg:border-l border-white/5 pt-3 lg:pt-0 lg:pl-3 space-y-4 ${activeTab === "chart" ? "hidden lg:block" : ""}`}>
          
          {/* Order Book Segment */}
          <div className={`${activeTab !== "orderbook" && activeTab !== "chart" ? "hidden" : "block"} space-y-2`}>
            <span className="text-[8.5px] font-mono font-black text-neutral-400 block tracking-widest uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
              Ордербук (Order Book)
            </span>

            {/* Simulated Live Asks (Sells) in red */}
            <div className="space-y-0.5 max-h-[90px] overflow-hidden">
              <table className="w-full text-right font-mono text-[9px] leading-tight">
                <thead>
                  <tr className="text-neutral-500 font-bold select-none text-[8px] border-b border-white/5">
                    <th className="text-left py-0.5">КУРС (TON)</th>
                    <th>ОБЪЕМ</th>
                    <th>ВСЕГО</th>
                  </tr>
                </thead>
                <tbody>
                  {simulatedAsks.slice(0, 4).map((ask, idx) => (
                    <tr key={`ask-${idx}`} className="hover:bg-red-500/5 transition-colors cursor-pointer text-red-400">
                      <td className="text-left font-semibold py-0.5">{ask.price.toFixed(4)}</td>
                      <td className="text-neutral-300">{ask.amount}</td>
                      <td className="text-neutral-400 font-semibold">{ask.total.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mid Ticker Price Banner */}
            <div className="py-1 bg-neutral-900/50 border-y border-white/5 text-center font-mono">
              <span className="text-sm font-black tracking-tight text-white block">
                {formatPrice(sharePrice)} TON
              </span>
              <span className="text-[7.5px] text-neutral-400 tracking-wider">СПРЕД: 0.08% • ПОДКЛЮЧЕНО</span>
            </div>

            {/* Simulated Live Bids (Buys) in green */}
            <div className="space-y-0.5 max-h-[90px] overflow-hidden">
              <table className="w-full text-right font-mono text-[9px] leading-tight">
                <tbody>
                  {simulatedBids.slice(0, 4).map((bid, idx) => (
                    <tr key={`bid-${idx}`} className="hover:bg-green-500/5 transition-colors cursor-pointer text-green-400">
                      <td className="text-left font-semibold py-0.5">{bid.price.toFixed(4)}</td>
                      <td className="text-neutral-300">{bid.amount}</td>
                      <td className="text-neutral-400 font-semibold">{bid.total.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Trades Segment */}
          <div className={`${activeTab !== "trades" && activeTab !== "chart" ? "hidden" : "block"} space-y-2 border-t border-white/5 pt-3`}>
            <span className="text-[8.5px] font-mono font-black text-neutral-400 block tracking-widest uppercase flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5 text-[#0098ea]" />
              Лента сделок (Trades)
            </span>

            <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
              <table className="w-full text-right font-mono text-[9px] leading-tight">
                <thead>
                  <tr className="text-neutral-500 font-bold text-[8px] border-b border-white/5 select-none">
                    <th className="text-left py-0.5">ВРЕМЯ</th>
                    <th>КУРС</th>
                    <th>КОЛ-ВО</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFills.map((fill) => (
                    <tr key={fill.id} className="hover:bg-white/5 transition-colors">
                      <td className="text-left text-neutral-500 py-0.5">{fill.time}</td>
                      <td className={fill.isBuy ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                        {fill.price.toFixed(4)}
                      </td>
                      <td className="text-neutral-200">{fill.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
