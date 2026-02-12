"use client";

import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import { BarChart3, TrendingUp, MapPin, Tag } from "lucide-react";
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
    PieChart,
    Pie,
    Cell,
} from "recharts";

function fmt(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    return `₹${n.toLocaleString("en-IN")}`;
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card-static p-3 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className="text-sm font-bold text-white">{fmt(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

const DailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card-static p-3 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} className="text-xs font-semibold" style={{ color: p.color }}>
                        {p.name}: {fmt(p.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function SalesPage() {
    const { data, loading } = useApi<any>("/api/commercial");

    if (loading || !data) return <PageSkeleton />;

    const citySales = (data.city_sales || [])
        .filter((c: any) => c.city !== "Online")
        .slice(0, 10)
        .map((c: any) => ({ city: c.city, sales: c.revenue }));

    const topProducts = (data.top_products?.top_by_quantity || []).slice(0, 10).map((p: any) => ({
        name: p.product_name,
        qty: p.quantity_sold,
    }));

    const channelMix = (data.channel_mix || []).map((c: any) => ({
        name: c.channel === "POS" ? "POS (In-Store)" : "Web (Online)",
        value: c.revenue_pct,
        color: c.channel === "POS" ? "#8b5cf6" : "#14b8a6",
    }));

    const monthlyTrend = (data.revenue?.monthly_trend || []).map((m: any) => ({
        month: m.year_month,
        revenue: m.revenue,
    }));

    const topCity = citySales[0] || {};
    const topProduct = topProducts[0] || {};
    const posPct = channelMix.find((c: any) => c.name.includes("POS"))?.value || 0;
    const webPct = channelMix.find((c: any) => c.name.includes("Web"))?.value || 0;

    return (
        <div className="space-y-6">
            <PageHeader
                icon={BarChart3}
                title="Sales Analytics"
                subtitle="City-wise sales breakdown, product performance & channel analysis"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard
                    icon={TrendingUp}
                    title="Total Revenue"
                    value={fmt(data.revenue?.summary?.total_revenue || 0)}
                    change={`${(data.revenue?.summary?.total_transactions || 0).toLocaleString()} txns`}
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="All time"
                />
                <KpiCard
                    icon={MapPin}
                    title="Top City"
                    value={topCity.city || "N/A"}
                    change={fmt(topCity.sales || 0)}
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="Highest revenue"
                />
                <KpiCard
                    icon={Tag}
                    title="Top Product"
                    value={topProduct.name || "N/A"}
                    change={`${(topProduct.qty || 0).toLocaleString()} units`}
                    trend="up"
                    accentColor="from-accent-teal to-emerald-400"
                    subtitle="Most sold"
                />
                <KpiCard
                    icon={BarChart3}
                    title="POS vs Web"
                    value={`${posPct.toFixed(0)} / ${webPct.toFixed(0)}`}
                    change="Channel ratio"
                    trend="neutral"
                    accentColor="from-accent-pink to-accent-orange"
                    subtitle="Revenue split %"
                />
            </div>

            <ChartCard
                title="City-wise Sales"
                subtitle={`Revenue breakdown across ${citySales.length} cities`}
                className="animate-slide-up"
            >
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={citySales} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                            <YAxis dataKey="city" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} width={85} />
                            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                            <Bar dataKey="sales" radius={[0, 6, 6, 0]} fill="url(#cityGrad)" barSize={20} />
                            <defs>
                                <linearGradient id="cityGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#8b5cf6" />
                                    <stop offset="100%" stopColor="#14b8a6" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ChartCard>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Top 10 Products" subtitle="By quantity sold" className="animate-slide-up">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts} layout="vertical" margin={{ left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} width={120} />
                                <Tooltip contentStyle={{ background: "rgba(15,15,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
                                <Bar dataKey="qty" radius={[0, 6, 6, 0]} fill="#3b82f6" barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Channel Revenue Split" subtitle="POS vs Online distribution" className="animate-slide-up">
                    <div className="flex flex-col items-center justify-center h-80">
                        <ResponsiveContainer width="100%" height="70%">
                            <PieChart>
                                <Pie data={channelMix} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none">
                                    {channelMix.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `${value}%`} contentStyle={{ background: "rgba(15,15,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex gap-8 mt-2">
                            {channelMix.map((item: any) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                                    <span className="text-sm text-slate-300 font-medium">{item.name}</span>
                                    <span className="text-sm font-bold text-white">{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </ChartCard>
            </div>

            <ChartCard title="Monthly Revenue Trend" subtitle="Revenue across all months" className="animate-slide-up">
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyTrend}>
                            <defs>
                                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                            <Tooltip content={<CustomBarTooltip />} />
                            <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#posGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </ChartCard>
        </div>
    );
}
