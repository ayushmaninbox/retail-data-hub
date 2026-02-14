"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    Shield,
    AlertTriangle,
    Users,
    Zap,
    TrendingUp,
    Filter,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Cell,
    PieChart,
    Pie,
} from "recharts";

/* ── Helpers ── */

function fmtNum(n: number | undefined | null): string {
    return (n ?? 0).toLocaleString("en-IN");
}

function fmt(n: number | undefined | null): string {
    const v = n ?? 0;
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    return `₹${v.toLocaleString("en-IN")}`;
}

const RISK_COLORS: Record<string, string> = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#eab308",
    Low: "#22c55e",
};

const CHANNEL_COLORS: Record<string, string> = {
    POS: "#8b5cf6",
    Web: "#14b8a6",
};

/* ── Tooltip ── */

const GlassTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card-dark p-4 border border-white/10 max-w-xs shadow-2xl rounded-2xl">
                <p className="text-sm text-slate-400 mb-2 font-bold tracking-tight">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: p.color || p.stroke }} />
                                <span className="text-xs font-medium text-slate-300">{p.name}</span>
                            </div>
                            <span className="text-sm font-black text-white">{fmtNum(p.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

/* ── Main Page ── */

export default function FraudPage() {
    const { data, loading } = useApi<any>("/api/fraud");
    const [riskFilter, setRiskFilter] = useState<string>("All");

    if (loading || !data || data.error) return <PageSkeleton />;

    const summary = data.summary || {};
    const riskDist = summary.risk_distribution || [];
    const topTxns = data.top_transactions || [];
    const topCustomers = data.top_customers || [];
    const byChannel = data.by_channel || [];
    const byCity = (data.by_city || []).slice(0, 10);
    const timeline = data.fraud_timeline || [];
    const signalFreq = data.signal_frequency || [];

    // Risk pie data
    const riskPieData = riskDist.map((r: any) => ({
        name: r.level,
        value: r.count,
        color: RISK_COLORS[r.level] || "#64748b",
    }));

    // Signal bar data
    const signalBarData = signalFreq.slice(0, 6).map((s: any, i: number) => ({
        name: s.signal,
        count: s.count,
        color: ["#8b5cf6", "#3b82f6", "#14b8a6", "#f59e0b", "#ec4899", "#ef4444"][i % 6],
    }));

    // Filter transactions
    const filteredTxns = riskFilter === "All"
        ? topTxns
        : topTxns.filter((t: any) => t.risk_level === riskFilter);

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Shield}
                title="Fraud Prevention"
                subtitle="Rule-based fraud scoring engine — identifying potentially fraudulent transactions"
            />

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 animate-slide-up">
                <KpiCard
                    icon={Shield}
                    title="Transactions Analyzed"
                    value={fmtNum(summary.total_transactions)}
                    change={`${summary.fraud_rate_pct || 0}% flagged`}
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="Total processed"
                />
                <KpiCard
                    icon={AlertTriangle}
                    title="Flagged Transactions"
                    value={fmtNum(summary.flagged_transactions)}
                    change={`${riskDist.find((r: any) => r.level === "Critical")?.count || 0} critical`}
                    trend="up"
                    accentColor="from-red-500 to-orange-500"
                    subtitle="Require review"
                />
                <KpiCard
                    icon={Zap}
                    title="Avg Fraud Score"
                    value={String(summary.avg_fraud_score || 0)}
                    change="Out of 100"
                    trend="up"
                    accentColor="from-amber-500 to-yellow-400"
                    subtitle="Among flagged"
                />
                <KpiCard
                    icon={Users}
                    title="Top Risk Customer"
                    value={topCustomers[0]?.customer_id?.substring(0, 12) || "N/A"}
                    change={`Score: ${topCustomers[0]?.total_risk_score || 0}`}
                    trend="up"
                    accentColor="from-red-600 to-red-400"
                    subtitle="Highest cumulative risk"
                />
            </div>

            {/* ── Row 2: Risk Distribution Pie + Signal Frequency ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.05s" }}>
                <ChartCard title="Risk Distribution" subtitle="Flagged transactions by risk level">
                    <div className="h-64 lg:h-72 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={riskPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {riskPieData.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                                    ))}
                                </Pie>
                                <Tooltip content={<GlassTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Fraud Signal Frequency" subtitle="Most triggered fraud detection rules">
                    <div className="h-64 lg:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={signalBarData} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} width={90} />
                                <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                                <Bar dataKey="count" name="Triggers" radius={[0, 8, 8, 0]} barSize={22}>
                                    {signalBarData.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* ── Row 3: Fraud Timeline ── */}
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <ChartCard title="Fraud Timeline" subtitle="Monthly distribution of flagged transactions">
                    <div className="h-56 lg:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeline}>
                                <defs>
                                    <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <Tooltip content={<GlassTooltip />} />
                                <Area type="monotone" dataKey="flagged_count" name="Flagged" stroke="#f97316" strokeWidth={2} fill="url(#fraudGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* ── Row 4: Channel + City ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.15s" }}>
                {/* Channel Comparison */}
                <ChartCard title="Fraud by Channel" subtitle="POS vs Web fraud distribution">
                    <div className="space-y-4 pt-2">
                        {byChannel.map((ch: any, i: number) => {
                            const color = CHANNEL_COLORS[ch.channel] || "#64748b";
                            const pct = summary.flagged_transactions > 0
                                ? Math.round((ch.flagged_count / summary.flagged_transactions) * 100)
                                : 0;
                            return (
                                <div key={i} className="p-4 rounded-xl" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-slate-800">{ch.channel}</span>
                                        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-xs text-slate-500">Flagged</p>
                                            <p className="text-sm font-bold text-slate-800">{fmtNum(ch.flagged_count)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Avg Score</p>
                                            <p className="text-sm font-bold text-slate-800">{ch.avg_score}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.05)" }}>
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ChartCard>

                {/* City bar chart */}
                <ChartCard title="Fraud by City" subtitle="Top cities by number of flagged transactions">
                    <div className="h-64 lg:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byCity}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 9 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                                <Bar dataKey="flagged_count" name="Flagged" radius={[6, 6, 0, 0]} barSize={24} fill="#f97316" fillOpacity={0.75} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* ── Row 5: Top Riskiest Transactions ── */}
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <ChartCard title="Top Flagged Transactions" subtitle="Highest fraud-risk transactions across all signals">
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <Filter className="w-4 h-4 text-slate-400" />
                        {["All", "Critical", "High", "Medium", "Low"].map((level) => (
                            <button
                                key={level}
                                onClick={() => setRiskFilter(level)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${riskFilter === level
                                        ? "bg-indigo-600 text-white shadow-md"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Risk</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Customer</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Product</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Amount</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Score</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Signals</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTxns.slice(0, 12).map((t: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-2.5 px-3">
                                            <span
                                                className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                                                style={{ background: RISK_COLORS[t.risk_level] || "#64748b" }}
                                            >
                                                {t.risk_level}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <span className="text-xs font-mono text-slate-600">{t.customer_id?.substring(0, 10)}</span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <span className="text-xs text-slate-700">{t.product_name?.substring(0, 22)}</span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <span className="text-sm font-bold text-slate-800">{fmt(t.total_amount)}</span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${t.fraud_score}%`, background: RISK_COLORS[t.risk_level] }} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">{t.fraud_score}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 max-w-xs">
                                            <div className="flex flex-wrap gap-1">
                                                {(t.signals || []).slice(0, 2).map((s: string, j: number) => (
                                                    <span key={j} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                                                        {s.split(":")[0]}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartCard>
            </div>

            {/* ── Row 6: Top Risk Customers ── */}
            <div className="animate-slide-up" style={{ animationDelay: "0.25s" }}>
                <ChartCard title="Top Risk Customers" subtitle="Customers with the highest cumulative fraud risk scores">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {topCustomers.slice(0, 10).map((c: any, i: number) => (
                            <div
                                key={i}
                                className="p-4 rounded-xl border transition-all hover:scale-[1.02]"
                                style={{
                                    background: `linear-gradient(135deg, ${i < 3 ? "#ef444410" : "#f9731610"}, transparent)`,
                                    borderColor: i < 3 ? "rgba(239,68,68,0.15)" : "rgba(249,115,22,0.12)",
                                }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                                        {i + 1}
                                    </div>
                                    <span className="text-xs font-mono text-slate-600 truncate">{c.customer_id?.substring(0, 10)}</span>
                                </div>
                                <p className="text-lg font-bold text-slate-800 mb-1">{c.total_risk_score}</p>
                                <div className="flex gap-3 text-xs text-slate-500">
                                    <span>{c.flagged_transactions} flags</span>
                                    <span>·</span>
                                    <span>Avg {c.avg_score}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}
