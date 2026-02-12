"use client";

import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import { Users, Heart, UserPlus, Star } from "lucide-react";
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
    Cell,
} from "recharts";

const segmentColors: Record<string, string> = {
    Champions: "#8b5cf6",
    "Loyal Customers": "#3b82f6",
    "Potential Loyalist": "#14b8a6",
    "At Risk": "#f97316",
    "Need Attention": "#eab308",
    "New Customers": "#06b6d4",
    Lost: "#6b7280",
};

const RFMTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="glass-card-static p-3 border border-white/10">
                <p className="text-xs font-bold text-white mb-1">{d.segment}</p>
                <p className="text-xs text-slate-400">{d.count} customers</p>
                <p className="text-xs text-slate-400">Avg Spend: {fmt(d.avg_monetary || 0)}</p>
            </div>
        );
    }
    return null;
};

function fmt(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n.toLocaleString("en-IN")}`;
}

export default function CustomersPage() {
    const { data, loading } = useApi<any>("/api/customers");

    if (loading || !data) return <PageSkeleton />;

    const summary = data.new_vs_returning?.summary || {};
    const monthlyNR = (data.new_vs_returning?.monthly_trend || []).map((m: any) => ({
        month: m.year_month,
        new: m.new_customers,
        returning: m.returning_customers,
    }));

    const clvStats = data.clv?.stats || {};
    // CLV segments is a dict like { platinum: 395, gold: 592, silver: 986, bronze: 1973 }
    const clvSegmentsRaw = data.clv?.segments || {};
    const clvSegments = typeof clvSegmentsRaw === "object" && !Array.isArray(clvSegmentsRaw)
        ? Object.entries(clvSegmentsRaw).map(([seg, count]) => ({
            range: seg.charAt(0).toUpperCase() + seg.slice(1),
            count: count as number,
        }))
        : (clvSegmentsRaw as any[]).map((s: any) => ({ range: s.segment, count: s.count }));

    // RFM segments is a list
    const rfmSegments = (data.rfm?.segments || []).map((s: any) => ({
        segment: s.segment,
        count: s.count,
        avg_monetary: s.avg_monetary,
        avg_recency: s.avg_recency,
        avg_frequency: s.avg_frequency,
        color: segmentColors[s.segment] || "#64748b",
    }));

    const champCount = rfmSegments.find((s: any) => s.segment === "Champions")?.count || 0;
    const totalCustomers = summary.total_unique_customers || 0;
    const champPct = totalCustomers > 0 ? ((champCount / totalCustomers) * 100).toFixed(1) : "0";

    return (
        <div className="space-y-6">
            <PageHeader icon={Users} title="Customer Analytics" subtitle="Customer lifetime value, RFM segmentation & retention analysis" />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard icon={UserPlus} title="Unique Customers" value={totalCustomers.toLocaleString()} change={`${summary.repeat_rate_pct || 0}% repeat`} trend="up" accentColor="from-accent-purple to-accent-blue" subtitle="All time" />
                <KpiCard icon={Users} title="Repeat Rate" value={`${summary.repeat_rate_pct || 0}%`} change={`${(summary.repeat_buyers || 0).toLocaleString()} buyers`} trend="up" accentColor="from-accent-blue to-accent-teal" subtitle="Multi-purchase customers" />
                <KpiCard icon={Heart} title="Avg CLV" value={fmt(clvStats.avg_clv || 0)} change={`Median: ${fmt(clvStats.median_clv || 0)}`} trend="up" accentColor="from-accent-teal to-emerald-400" subtitle="Customer lifetime value" />
                <KpiCard icon={Star} title="Champions" value={`${champPct}%`} change={`${champCount} customers`} trend="up" accentColor="from-accent-pink to-accent-purple" subtitle="Top RFM segment" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="New vs Returning Customers" subtitle="Monthly breakdown" className="animate-slide-up">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyNR}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <Tooltip contentStyle={{ background: "rgba(15,15,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
                                <Bar dataKey="returning" name="Returning" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} barSize={28} />
                                <Bar dataKey="new" name="New" stackId="a" fill="#14b8a6" radius={[6, 6, 0, 0]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex gap-6 mt-3 justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-accent-purple" />
                            <span className="text-xs text-slate-400">Returning</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-accent-teal" />
                            <span className="text-xs text-slate-400">New</span>
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="CLV Distribution" subtitle="Customer count by lifetime value tier" className="animate-slide-up">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={clvSegments}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <Tooltip contentStyle={{ background: "rgba(15,15,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="url(#clvGrad)" barSize={32} />
                                <defs>
                                    <linearGradient id="clvGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ec4899" />
                                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0.3} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            <ChartCard title="RFM Segmentation" subtitle="Customer segments by Recency, Frequency & Monetary value" className="animate-slide-up">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rfmSegments} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <YAxis dataKey="segment" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} width={130} />
                                <Tooltip content={<RFMTooltip />} />
                                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                                    {rfmSegments.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Segment Breakdown</p>
                        {rfmSegments.map((seg: any) => (
                            <div key={seg.segment} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-white">{seg.segment}</span>
                                        <span className="text-xs font-bold text-slate-300">{seg.count}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">Avg Spend: {fmt(seg.avg_monetary || 0)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </ChartCard>
        </div>
    );
}
