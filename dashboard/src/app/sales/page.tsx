"use client";

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

// --- Dummy Data ---
const cityData = [
    { city: "Mumbai", sales: 2180000 },
    { city: "Delhi", sales: 1920000 },
    { city: "Bangalore", sales: 1650000 },
    { city: "Chennai", sales: 1340000 },
    { city: "Hyderabad", sales: 1180000 },
    { city: "Pune", sales: 980000 },
    { city: "Ahmedabad", sales: 870000 },
    { city: "Kolkata", sales: 760000 },
    { city: "Jaipur", sales: 620000 },
    { city: "Lucknow", sales: 540000 },
];

const topProducts = [
    { name: "Wireless Earbuds", qty: 1240 },
    { name: "USB-C Cable", qty: 1120 },
    { name: "Phone Case", qty: 980 },
    { name: "Screen Protector", qty: 870 },
    { name: "Power Bank", qty: 760 },
    { name: "Bluetooth Speaker", qty: 650 },
    { name: "Mouse Pad", qty: 590 },
    { name: "LED Desk Lamp", qty: 520 },
    { name: "Webcam HD", qty: 480 },
    { name: "Keyboard", qty: 430 },
];

const dailyRevenue = [
    { date: "Feb 1", pos: 42000, web: 28000 },
    { date: "Feb 2", pos: 38000, web: 31000 },
    { date: "Feb 3", pos: 35000, web: 25000 },
    { date: "Feb 4", pos: 48000, web: 35000 },
    { date: "Feb 5", pos: 52000, web: 38000 },
    { date: "Feb 6", pos: 45000, web: 42000 },
    { date: "Feb 7", pos: 40000, web: 30000 },
    { date: "Feb 8", pos: 55000, web: 45000 },
    { date: "Feb 9", pos: 50000, web: 40000 },
    { date: "Feb 10", pos: 47000, web: 36000 },
    { date: "Feb 11", pos: 60000, web: 48000 },
    { date: "Feb 12", pos: 58000, web: 44000 },
    { date: "Feb 13", pos: 62000, web: 50000 },
    { date: "Feb 14", pos: 70000, web: 55000 },
];

const channelSplit = [
    { name: "POS (In-Store)", value: 59.6, color: "#8b5cf6" },
    { name: "Web (Online)", value: 40.4, color: "#14b8a6" },
];

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card-static p-3 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className="text-sm font-bold text-white">
                    ₹{(payload[0].value / 100000).toFixed(2)}L
                </p>
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
                        {p.name}: ₹{(p.value / 1000).toFixed(0)}K
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function SalesPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                icon={BarChart3}
                title="Sales Analytics"
                subtitle="City-wise sales breakdown, product performance & channel analysis"
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard
                    icon={TrendingUp}
                    title="Today's Revenue"
                    value="₹1,12,000"
                    change="+18.3%"
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="vs yesterday"
                />
                <KpiCard
                    icon={MapPin}
                    title="Top City"
                    value="Mumbai"
                    change="₹21.8L"
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="Highest revenue"
                />
                <KpiCard
                    icon={Tag}
                    title="Top Product"
                    value="Wireless Earbuds"
                    change="1,240 units"
                    trend="up"
                    accentColor="from-accent-teal to-emerald-400"
                    subtitle="Most sold"
                />
                <KpiCard
                    icon={BarChart3}
                    title="POS vs Web"
                    value="60 / 40"
                    change="Balanced"
                    trend="neutral"
                    accentColor="from-accent-pink to-accent-orange"
                    subtitle="Channel ratio"
                />
            </div>

            {/* City-wise Sales */}
            <ChartCard
                title="City-wise Sales"
                subtitle="Revenue breakdown across 10 Indian cities"
                className="animate-slide-up"
            >
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cityData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.05)"
                                horizontal={false}
                            />
                            <XAxis
                                type="number"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#64748b", fontSize: 11 }}
                                tickFormatter={(v) => `₹${v / 100000}L`}
                            />
                            <YAxis
                                dataKey="city"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#94a3b8", fontSize: 12 }}
                                width={85}
                            />
                            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                            <Bar
                                dataKey="sales"
                                radius={[0, 6, 6, 0]}
                                fill="url(#cityGrad)"
                                barSize={20}
                            />
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
                {/* Top Products */}
                <ChartCard
                    title="Top 10 Products"
                    subtitle="By quantity sold"
                    className="animate-slide-up"
                >
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts} layout="vertical" margin={{ left: 30 }}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(255,255,255,0.05)"
                                    horizontal={false}
                                />
                                <XAxis
                                    type="number"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    width={120}
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
                                <Bar dataKey="qty" radius={[0, 6, 6, 0]} fill="#3b82f6" barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Channel Revenue Split */}
                <ChartCard
                    title="Channel Revenue Split"
                    subtitle="POS vs Online distribution"
                    className="animate-slide-up"
                >
                    <div className="flex flex-col items-center justify-center h-80">
                        <ResponsiveContainer width="100%" height="70%">
                            <PieChart>
                                <Pie
                                    data={channelSplit}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={95}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {channelSplit.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => `${value}%`}
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
                        <div className="flex gap-8 mt-2">
                            {channelSplit.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ background: item.color }}
                                    />
                                    <span className="text-sm text-slate-300 font-medium">
                                        {item.name}
                                    </span>
                                    <span className="text-sm font-bold text-white">
                                        {item.value}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </ChartCard>
            </div>

            {/* Daily Revenue Trend */}
            <ChartCard
                title="Daily Revenue Trend"
                subtitle="POS vs Web — last 14 days"
                className="animate-slide-up"
            >
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyRevenue}>
                            <defs>
                                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="webGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#64748b", fontSize: 11 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#64748b", fontSize: 11 }}
                                tickFormatter={(v) => `₹${v / 1000}K`}
                            />
                            <Tooltip content={<DailyTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="pos"
                                name="POS"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                fill="url(#posGrad)"
                            />
                            <Area
                                type="monotone"
                                dataKey="web"
                                name="Web"
                                stroke="#14b8a6"
                                strokeWidth={2}
                                fill="url(#webGrad)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex gap-6 mt-3 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-accent-purple rounded" />
                        <span className="text-xs text-slate-400">POS Sales</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-accent-teal rounded" />
                        <span className="text-xs text-slate-400">Web Sales</span>
                    </div>
                </div>
            </ChartCard>
        </div>
    );
}
