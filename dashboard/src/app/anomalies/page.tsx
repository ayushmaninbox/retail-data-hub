"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    AlertTriangle,
    Activity,
    MapPin,
    Package,
    TrendingUp,
    Search,
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

const SEVERITY_COLORS: Record<string, string> = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#eab308",
    Low: "#22c55e",
};

const TYPE_COLORS: Record<string, string> = {
    revenue_spike: "#8b5cf6",
    revenue_drop: "#3b82f6",
    quantity_outlier: "#f59e0b",
    price_anomaly: "#ec4899",
    multivariate: "#14b8a6",
};

const TYPE_LABELS: Record<string, string> = {
    revenue_spike: "Revenue Spike",
    revenue_drop: "Revenue Drop",
    quantity_outlier: "Quantity Outlier",
    price_anomaly: "Price Anomaly",
    multivariate: "ML Detected",
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

export default function AnomaliesPage() {
    const { data, loading } = useApi<any>("/api/anomalies");
    const [severityFilter, setSeverityFilter] = useState<string>("All");

    if (loading || !data || data.error) return <PageSkeleton />;

    const summary = data.summary || {};
    const severityDist = summary.severity_distribution || {};
    const byType = summary.by_type || [];
    const timeline = data.timeline || [];
    const byCity = (data.by_city || []).slice(0, 10);
    const topAnomalies = data.top_anomalies || [];

    // Severity pie data
    const severityPieData = Object.entries(severityDist).map(([level, count]) => ({
        name: level,
        value: count as number,
        color: SEVERITY_COLORS[level] || "#64748b",
    }));

    // Type bar data
    const typeBarData = byType.map((t: any) => ({
        name: TYPE_LABELS[t.type] || t.type,
        count: t.count,
        color: TYPE_COLORS[t.type] || "#64748b",
    }));

    // Filter anomalies
    const filteredAnomalies = severityFilter === "All"
        ? topAnomalies
        : topAnomalies.filter((a: any) => a.severity === severityFilter);

    return (
        <div className="space-y-6">
            <PageHeader
                icon={AlertTriangle}
                title="Anomaly Detection"
                subtitle="Statistical & ML-powered anomaly detection across revenue, quantity, pricing, and multivariate signals"
            />

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 animate-slide-up">
                <KpiCard
                    icon={AlertTriangle}
                    title="Total Anomalies"
                    value={fmtNum(summary.total_anomalies)}
                    change={`${severityDist.Critical || 0} critical`}
                    trend="up"
                    accentColor="from-red-500 to-orange-500"
                    subtitle="Detected across all methods"
                />
                <KpiCard
                    icon={Activity}
                    title="Critical Alerts"
                    value={fmtNum(severityDist.Critical || 0)}
                    change={`${severityDist.High || 0} high severity`}
                    trend="up"
                    accentColor="from-red-600 to-red-400"
                    subtitle="Require immediate review"
                />
                <KpiCard
                    icon={MapPin}
                    title="Most Affected City"
                    value={summary.most_affected_city || "N/A"}
                    change="Highest anomaly count"
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="Geographic hotspot"
                />
                <KpiCard
                    icon={Package}
                    title="Most Affected Product"
                    value={(summary.most_affected_product || "N/A").substring(0, 20)}
                    change="Highest anomaly count"
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="Product hotspot"
                />
            </div>

            {/* ── Row 2: Severity Pie + Detection Type Bar ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.05s" }}>
                <ChartCard title="Severity Distribution" subtitle="Breakdown of anomalies by risk level">
                    <div className="h-64 lg:h-72 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={severityPieData}
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
                                    {severityPieData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                                    ))}
                                </Pie>
                                <Tooltip content={<GlassTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Detection Methods" subtitle="Anomalies found by each detection technique">
                    <div className="h-64 lg:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeBarData} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} width={90} />
                                <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                                <Bar dataKey="count" name="Anomalies" radius={[0, 8, 8, 0]} barSize={22}>
                                    {typeBarData.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* ── Row 3: Timeline ── */}
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <ChartCard title="Anomaly Timeline" subtitle="Daily distribution of detected anomalies">
                    <div className="h-56 lg:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeline}>
                                <defs>
                                    <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 9 }} interval={Math.max(0, Math.floor(timeline.length / 12))} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <Tooltip content={<GlassTooltip />} />
                                <Area type="monotone" dataKey="count" name="Anomalies" stroke="#ef4444" strokeWidth={2} fill="url(#anomalyGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* ── Row 4: City breakdown ── */}
            <div className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
                <ChartCard title="Anomalies by City" subtitle="Geographic distribution of detected anomalies">
                    <div className="h-56 lg:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byCity}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 9 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                                <Bar dataKey="count" name="Anomalies" radius={[6, 6, 0, 0]} barSize={24} fill="#8b5cf6" fillOpacity={0.75} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* ── Row 5: Flagged Transactions Table ── */}
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <ChartCard
                    title="Top Flagged Transactions"
                    subtitle="Most severe anomalies detected across all methods"
                >
                    {/* Filter bar */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <Filter className="w-4 h-4 text-slate-400" />
                        {["All", "Critical", "High", "Medium", "Low"].map((sev) => (
                            <button
                                key={sev}
                                onClick={() => setSeverityFilter(sev)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${severityFilter === sev
                                        ? "bg-indigo-600 text-white shadow-md"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {sev}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Severity</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Type</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Description</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Score</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAnomalies.slice(0, 15).map((a: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-2.5 px-3">
                                            <span
                                                className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                                                style={{ background: SEVERITY_COLORS[a.severity] || "#64748b" }}
                                            >
                                                {a.severity}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <span className="text-xs font-medium text-slate-600">
                                                {TYPE_LABELS[a.type] || a.type}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 max-w-sm">
                                            <p className="text-xs text-slate-700 truncate">{a.description}</p>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <span className="text-sm font-bold text-slate-800">{a.score}</span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <span className="text-xs text-slate-500">{a.date}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}
