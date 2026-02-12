"use client";

import { Truck, Clock, CheckCircle, AlertCircle } from "lucide-react";
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

const delayColors = ["#14b8a6", "#3b82f6", "#8b5cf6", "#f97316", "#ef4444"];

// --- Dummy Data ---
const deliveryByRoute = [
    { route: "Mumbai → Pune", avgDays: 1.2 },
    { route: "Delhi → Jaipur", avgDays: 1.8 },
    { route: "Bangalore → Chennai", avgDays: 2.1 },
    { route: "Hyderabad → Mumbai", avgDays: 3.2 },
    { route: "Kolkata → Delhi", avgDays: 3.8 },
    { route: "Chennai → Hyderabad", avgDays: 2.5 },
    { route: "Pune → Ahmedabad", avgDays: 2.0 },
    { route: "Jaipur → Lucknow", avgDays: 2.8 },
];

const delayDistribution = [
    { bucket: "On Time", count: 4820 },
    { bucket: "1 Day Late", count: 1240 },
    { bucket: "2 Days Late", count: 680 },
    { bucket: "3 Days Late", count: 320 },
    { bucket: "4+ Days Late", count: 180 },
];

const bottleneckRoutes = [
    { route: "Kolkata → Delhi", avgDelay: 1.8, shipments: 420, onTimeRate: "62%", issue: "Weather delays" },
    { route: "Hyderabad → Mumbai", avgDelay: 1.5, shipments: 380, onTimeRate: "68%", issue: "Road construction" },
    { route: "Jaipur → Lucknow", avgDelay: 1.2, shipments: 290, onTimeRate: "72%", issue: "Carrier capacity" },
    { route: "Chennai → Hyderabad", avgDelay: 0.9, shipments: 340, onTimeRate: "78%", issue: "Last-mile delays" },
    { route: "Bangalore → Chennai", avgDelay: 0.6, shipments: 510, onTimeRate: "83%", issue: "Peak season volume" },
];

export default function LogisticsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                icon={Truck}
                title="Logistics"
                subtitle="Delivery performance, delay analysis & route bottlenecks"
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard
                    icon={Clock}
                    title="Avg Delivery Time"
                    value="2.3 days"
                    change="-0.4d"
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="All routes combined"
                />
                <KpiCard
                    icon={CheckCircle}
                    title="On-Time Rate"
                    value="78.4%"
                    change="+3.2%"
                    trend="up"
                    accentColor="from-accent-teal to-emerald-400"
                    subtitle="Delivered within SLA"
                />
                <KpiCard
                    icon={AlertCircle}
                    title="Delayed Shipments"
                    value="2,420"
                    change="-180"
                    trend="up"
                    accentColor="from-amber-500 to-accent-orange"
                    subtitle="This month"
                />
                <KpiCard
                    icon={Truck}
                    title="Total Shipments"
                    value="7,240"
                    change="+12%"
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="Last 30 days"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Delivery Time by Route */}
                <ChartCard
                    title="Avg Delivery Time by Route"
                    subtitle="Days from dispatch to delivery"
                    className="animate-slide-up"
                >
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deliveryByRoute} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis
                                    type="number"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                    tickFormatter={(v) => `${v}d`}
                                />
                                <YAxis
                                    dataKey="route"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    width={140}
                                />
                                <Tooltip
                                    formatter={(value: number) => [`${value} days`, "Avg Delivery"]}
                                    contentStyle={{
                                        background: "rgba(15,15,35,0.95)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                        color: "#fff",
                                        fontSize: "12px",
                                    }}
                                />
                                <Bar dataKey="avgDays" radius={[0, 6, 6, 0]} fill="url(#routeGrad)" barSize={18} />
                                <defs>
                                    <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#8b5cf6" />
                                        <stop offset="100%" stopColor="#3b82f6" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Delay Distribution */}
                <ChartCard
                    title="Delay Distribution"
                    subtitle="Shipment count by delay category"
                    className="animate-slide-up"
                >
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={delayDistribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="bucket"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 10 }}
                                    angle={-15}
                                    textAnchor="end"
                                    height={50}
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
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                                    {delayDistribution.map((_, index) => (
                                        <Cell key={index} fill={delayColors[index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Bottleneck Routes */}
            <ChartCard
                title="Bottleneck Routes"
                subtitle="Routes with the highest average delays — sorted by severity"
                className="animate-slide-up"
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Route</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Avg Delay (days)</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Shipments</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">On-Time Rate</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3">Root Cause</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bottleneckRoutes.map((route) => (
                                <tr
                                    key={route.route}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="py-3 pr-4 text-sm font-medium text-white">{route.route}</td>
                                    <td className="py-3 pr-4">
                                        <span
                                            className={`text-sm font-bold ${route.avgDelay >= 1.5
                                                ? "text-red-400"
                                                : route.avgDelay >= 1.0
                                                    ? "text-amber-400"
                                                    : "text-emerald-400"
                                                }`}
                                        >
                                            +{route.avgDelay}d
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4 text-sm text-slate-400">{route.shipments}</td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full max-w-[80px]">
                                                <div
                                                    className="h-1.5 rounded-full bg-gradient-to-r from-accent-purple to-accent-teal"
                                                    style={{ width: route.onTimeRate }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-400">{route.onTimeRate}</span>
                                        </div>
                                    </td>
                                    <td className="py-3">
                                        <span className="text-xs text-slate-500 bg-white/[0.04] px-2 py-1 rounded-md">
                                            {route.issue}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ChartCard>
        </div>
    );
}
