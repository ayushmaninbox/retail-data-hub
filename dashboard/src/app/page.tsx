"use client";

import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    IndianRupee,
    ShoppingBag,
    Users,
    CreditCard,
} from "lucide-react";
import { LayoutDashboard } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card-static p-3 border border-white/10">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-bold text-white">
                    ₹{(payload[0].value / 10000000).toFixed(2)} Cr
                </p>
            </div>
        );
    }
    return null;
};

function fmt(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    return `₹${n.toLocaleString("en-IN")}`;
}

export default function OverviewPage() {
    const { data, loading } = useApi<any>("/api/overview");

    if (loading || !data) return <PageSkeleton />;

    const rev = data.revenue || {};
    const channelMix = (data.channel_mix || []).map((c: any) => ({
        name: c.channel === "POS" ? "POS (In-Store)" : "Web (Online)",
        value: c.revenue,
        color: c.channel === "POS" ? "#8b5cf6" : "#14b8a6",
    }));
    const monthlyTrend = (data.monthly_trend || []).map((m: any) => ({
        month: m.year_month,
        revenue: m.revenue,
    }));
    const customers = data.customers || {};

    return (
        <div className="space-y-6">
            <PageHeader
                icon={LayoutDashboard}
                title="Overview"
                subtitle="Your retail business at a glance — key metrics and trends"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard
                    icon={IndianRupee}
                    title="Total Revenue"
                    value={fmt(rev.total_revenue || 0)}
                    change={`${(rev.total_transactions || 0).toLocaleString()} txns`}
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="All time"
                />
                <KpiCard
                    icon={ShoppingBag}
                    title="Total Orders"
                    value={(rev.total_transactions || 0).toLocaleString()}
                    change={`${(rev.total_units_sold || 0).toLocaleString()} units`}
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="All time"
                />
                <KpiCard
                    icon={Users}
                    title="Unique Customers"
                    value={(customers.total_unique_customers || 0).toLocaleString()}
                    change={`${customers.repeat_rate_pct || 0}% repeat`}
                    trend="up"
                    accentColor="from-accent-teal to-emerald-400"
                    subtitle="Active buyers"
                />
                <KpiCard
                    icon={CreditCard}
                    title="Avg Order Value"
                    value={fmt(rev.avg_transaction_value || 0)}
                    change="Per transaction"
                    trend="neutral"
                    accentColor="from-accent-pink to-accent-orange"
                    subtitle="Across all channels"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <ChartCard
                    title="Revenue Trend"
                    subtitle="Monthly revenue across all channels"
                    className="xl:col-span-2"
                >
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyTrend}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
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
                                    tickFormatter={(v) => `₹${(v / 10000000).toFixed(0)}Cr`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#8b5cf6"
                                    strokeWidth={2.5}
                                    fill="url(#revenueGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Channel Mix" subtitle="POS vs Web revenue split">
                    <div className="h-72 flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="70%">
                            <PieChart>
                                <Pie
                                    data={channelMix}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {channelMix.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => fmt(value)}
                                    contentStyle={{
                                        background: "rgba(15,15,35,0.95)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                        color: "#fff",
                                        fontSize: "12px",
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex gap-6 mt-2">
                            {channelMix.map((item: any) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ background: item.color }}
                                    />
                                    <span className="text-xs text-slate-400">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}
