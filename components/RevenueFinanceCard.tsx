"use client";

import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function RevenueFinanceCard({ stagedChannel, t, formatNumber }: any) {
  const [period, setPeriod] = useState<"monthly" | "quarterly">("monthly");

  const monthlyBase = stagedChannel.monthlyRevenue || 5000;
  const netRatio = (stagedChannel.netProfitPercent || 70) / 100;

  const mockMonthly = [
    { name: 'Jan', revenue: monthlyBase * 0.8, profit: monthlyBase * 0.8 * netRatio },
    { name: 'Feb', revenue: monthlyBase * 0.9, profit: monthlyBase * 0.9 * netRatio },
    { name: 'Mar', revenue: monthlyBase * 1.0, profit: monthlyBase * 1.0 * netRatio },
    { name: 'Apr', revenue: monthlyBase * 0.95, profit: monthlyBase * 0.95 * netRatio },
    { name: 'May', revenue: monthlyBase * 1.1, profit: monthlyBase * 1.1 * netRatio },
    { name: 'Jun', revenue: monthlyBase * 1.2, profit: monthlyBase * 1.2 * netRatio },
  ];

  const mockQuarterly = [
    { name: 'Q1', revenue: monthlyBase * 2.7, profit: monthlyBase * 2.7 * netRatio },
    { name: 'Q2', revenue: monthlyBase * 3.2, profit: monthlyBase * 3.2 * netRatio },
    { name: 'Q3', revenue: monthlyBase * 3.5, profit: monthlyBase * 3.5 * netRatio },
    { name: 'Q4', revenue: monthlyBase * 4.1, profit: monthlyBase * 4.1 * netRatio },
  ];

  const data = period === "monthly" ? mockMonthly : mockQuarterly;

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
          {t("Financial & Monetization", "Финансовые показатели и Монетизация")}
        </h4>
        <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 font-mono text-[9px]">
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-2 py-1 rounded transition-colors ${period === "monthly" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white"}`}
          >
            {t("Monthly", "Месяц")}
          </button>
          <button
            onClick={() => setPeriod("quarterly")}
            className={`px-2 py-1 rounded transition-colors ${period === "quarterly" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white"}`}
          >
            {t("Quarterly", "Квартал")}
          </button>
        </div>
      </div>
      
      <div className="liquid-glass rounded-2xl p-4 border border-white/5 space-y-4">
        {/* Key Metrics summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-neutral-400">{t("Gross Revenue", "Доходы")}</span>
            <span className="text-white">~{formatNumber(period === "monthly" ? monthlyBase : monthlyBase * 3)} USDT</span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-neutral-400">{t("Expenses", "Расходы (Трафик, Серверы, ЗП)")}</span>
            <span className="text-neutral-300">~{formatNumber(period === "monthly" ? monthlyBase * (1 - netRatio) : monthlyBase * 3 * (1 - netRatio))} USDT</span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-neutral-400">{t("Net Profit", "Чистая прибыль")}</span>
            <span className="text-emerald-400 font-bold">~{formatNumber(period === "monthly" ? monthlyBase * netRatio : monthlyBase * 3 * netRatio)} USDT</span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono border-t border-white/5 pt-2 mt-2">
            <span className="text-neutral-400">{t("Dividend Strategy", "Дивиденды инвесторам (APY)")}</span>
            <span className="text-amber-400 font-bold">{stagedChannel.yieldPercent}% APY</span>
          </div>
        </div>

        {/* Traffic vs Revenue Chart Mock */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3 text-[9px] font-mono uppercase text-neutral-500">
            <span>{t("Traffic vs Income", "Трафик vs Доход")}</span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#18181C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                  itemStyle={{ padding: 0 }}
                  formatter={(value: any) => [`${(value || 0).toFixed(0)} USDT`, '']}
                />
                <Bar dataKey="revenue" name={t("Revenue", "Доход")} fill="#38bdf8" radius={[2, 2, 0, 0]} barSize={8} />
                <Bar dataKey="profit" name={t("Profit", "Прибыль")} fill="#34d399" radius={[2, 2, 0, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
