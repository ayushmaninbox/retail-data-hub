"use client";

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
    ScatterChart,
    Scatter,
    ZAxis,
    Cell,
} from "recharts";

// --- Dummy Data ---
const newVsReturning = [
    { month: "Jul", new: 180, returning: 420 },
    { month: "Aug", new: 210, returning: 450 },
    { month: "Sep", new: 195, returning: 480 },
    { month: "Oct", new: 240, returning: 510 },
    { month: "Nov", new: 280, returning: 540 },
    { month: "Dec", new: 320, returning: 580 },
    { month: "Jan", new: 260, returning: 550 },
    { month: "Feb", new: 230, returning: 520 },
];

const clvDistribution = [
    { range: "₹0-1K", count: 820 },
    { range: "₹1K-3K", count: 1240 },
    { range: "₹3K-5K", count: 680 },
    { range: "₹5K-10K", count: 290 },
    { range: "₹10K-20K", count: 98 },
    { range: "₹20K+", count: 28 },
];

const rfmSegments = [
    { recency: 5, frequency: 82, monetary: 45000, segment: "Champions", color: "#8b5cf6" },
    { recency: 12, frequency: 45, monetary: 28000, segment: "Loyal", color: "#3b82f6" },
    { recency: 8, frequency: 60, monetary: 35000, segment: "Loyal", color: "#3b82f6" },
    { recency: 30, frequency: 20, monetary: 12000, segment: "At Risk", color: "#f97316" },
    { recency: 45, frequency: 10, monetary: 5000, segment: "Hibernating", color: "#ef4444" },
    { recency: 3, frequency: 90, monetary: 52000, segment: "Champions", color: "#8b5cf6" },
    { recency: 15, frequency: 35, monetary: 22000, segment: "Potential", color: "#14b8a6" },
    { recency: 60, frequency: 5, monetary: 3000, segment: "Lost", color: "#6b7280" },
    { recency: 20, frequency: 28, monetary: 18000, segment: "Potential", color: "#14b8a6" },
    { recency: 7, frequency: 70, monetary: 40000, segment: "Champions", color: "#8b5cf6" },
    { recency: 25, frequency: 15, monetary: 9000, segment: "At Risk", color: "#f97316" },
    { recency: 35, frequency: 8, monetary: 4200, segment: "Hibernating", color: "#ef4444" },
    { recency: 10, frequency: 55, monetary: 32000, segment: "Loyal", color: "#3b82f6" },
    { recency: 50, frequency: 3, monetary: 1800, segment: "Lost", color: "#6b7280" },
    { recency: 6, frequency: 75, monetary: 42000, segment: "Champions", color: "#8b5cf6" },
];

const segmentSummary = [
    { segment: "Champions", count: 420, pct: "13.3%", color: "#8b5cf6", description: "High value, recent buyers" },
    { segment: "Loyal", count: 680, pct: "21.5%", color: "#3b82f6", description: "Consistent repeat buyers" },
    { segment: "Potential", count: 540, pct: "17.1%", color: "#14b8a6", description: "Growing engagement" },
    { segment: "At Risk", count: 890, pct: "28.2%", color: "#f97316", description: "Declining activity" },
    { segment: "Hibernating", count: 380, pct: "12.0%", color: "#ef4444", description: "Long inactive" },
    { segment: "Lost", count: 246, pct: "7.8%", color: "#6b7280", description: "No recent activity" },
];

const RFMTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="glass-card-static p-3 border border-white/10">
                <p className="text-xs font-bold text-white mb-1">{data.segment}</p>
                <p className="text-xs text-slate-400">Recency: {data.recency} days</p>
                <p className="text-xs text-slate-400">Frequency: {data.frequency} orders</p>
                <p className="text-xs text-slate-400">Monetary: ₹{(data.monetary / 1000).toFixed(0)}K</p>
            </div>
        );
    }
    return null;
};

export default function CustomersPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                icon={Users}
                title="Customer Analytics"
                subtitle="Customer lifetime value, RFM segmentation & retention analysis"
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard
                    icon={UserPlus}
                    title="New Customers"
                    value="230"
                    change="+15%"
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="This month"
                />
                <KpiCard
                    icon={Users}
                    title="Returning Customers"
                    value="520"
                    change="+8.3%"
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="This month"
                />
                <KpiCard
                    icon={Heart}
                    title="Avg CLV"
                    value="₹4,280"
                    change="+₹320"
                    trend="up"
                    accentColor="from-accent-teal to-emerald-400"
                    subtitle="Customer lifetime value"
                />
                <KpiCard
                    icon={Star}
                    title="Champions"
                    value="13.3%"
                    change="+2.1%"
                    trend="up"
                    accentColor="from-accent-pink to-accent-purple"
                    subtitle="Top RFM segment"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* New vs Returning */}
                <ChartCard
                    title="New vs Returning Customers"
                    subtitle="Monthly breakdown over the last 8 months"
                    className="animate-slide-up"
                >
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={newVsReturning}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "rgba(15,15,35,0.95)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                        color: "#fff",
                                        fontSize: "12px",
                                    }}
                                />
                                <Bar
                                    dataKey="returning"
                                    name="Returning"
                                    stackId="a"
                                    fill="#8b5cf6"
                                    radius={[0, 0, 0, 0]}
                                    barSize={28}
                                />
                                <Bar
                                    dataKey="new"
                                    name="New"
                                    stackId="a"
                                    fill="#14b8a6"
                                    radius={[6, 6, 0, 0]}
                                    barSize={28}
                                />
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

                {/* CLV Distribution */}
                <ChartCard
                    title="CLV Distribution"
                    subtitle="Customer count by lifetime value range"
                    className="animate-slide-up"
                >
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={clvDistribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="range"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 10 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "rgba(15,15,35,0.95)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                        color: "#fff",
                                        fontSize: "12px",
                                    }}
                                />
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

            {/* RFM Scatter Plot */}
            <ChartCard
                title="RFM Segmentation"
                subtitle="Recency vs Frequency — bubble size = monetary value"
                className="animate-slide-up"
            >
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="recency"
                                    name="Recency (days)"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                    label={{ value: "Recency (days ago)", position: "bottom", fill: "#64748b", fontSize: 11 }}
                                />
                                <YAxis
                                    dataKey="frequency"
                                    name="Frequency"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                    label={{ value: "Frequency", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }}
                                />
                                <ZAxis dataKey="monetary" range={[50, 400]} />
                                <Tooltip content={<RFMTooltip />} />
                                <Scatter data={rfmSegments}>
                                    {rfmSegments.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} fillOpacity={0.7} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Segment Summary */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                            Segment Breakdown
                        </p>
                        {segmentSummary.map((seg) => (
                            <div
                                key={seg.segment}
                                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                            >
                                <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ background: seg.color }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-white">{seg.segment}</span>
                                        <span className="text-xs font-bold text-slate-300">{seg.pct}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">{seg.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </ChartCard>
        </div>
    );
}
