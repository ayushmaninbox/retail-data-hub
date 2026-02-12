"use client";

import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
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

const delayColors = ["#14b8a6", "#3b82f6", "#8b5cf6", "#f97316", "#ef4444", "#ec4899", "#6b7280", "#eab308"];

export default function LogisticsPage() {
    const { data, loading } = useApi<any>("/api/operations");

    if (loading || !data) return <PageSkeleton />;

    const overall = data.delivery_times?.overall || {};
    const byCarrier = (data.delivery_times?.by_carrier || []).map((c: any) => ({
        carrier: c.carrier,
        avgDays: c.avg_days,
        shipments: c.shipments,
        delayed: c.delayed,
        delayPct: c.delay_pct,
    }));

    const distribution = (data.delivery_times?.distribution || []).map((d: any) => ({
        bucket: `${d.days} days`,
        count: d.shipments,
    }));

    const bottlenecks = (data.delivery_times?.by_destination || [])
        .sort((a: any, b: any) => b.avg_days - a.avg_days)
        .slice(0, 6)
        .map((d: any) => ({
            city: d.destination_city,
            avgDays: d.avg_days,
            shipments: d.shipments,
            bottleneck: d.bottleneck_shipments,
            bottleneckPct: d.bottleneck_pct,
            onTimeRate: `${(100 - (d.bottleneck_pct || 0)).toFixed(0)}%`,
        }));

    const totalShipments = overall.total_shipments || 0;
    const delayed = overall.delayed || 0;
    const onTimePct = totalShipments > 0 ? (((overall.delivered || 0) / totalShipments) * 100).toFixed(1) : "0";

    return (
        <div className="space-y-6">
            <PageHeader icon={Truck} title="Logistics" subtitle="Delivery performance, delay analysis & route bottlenecks" />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard icon={Clock} title="Avg Delivery Time" value={`${overall.avg_delivery_days || 0} days`} change={`Median: ${overall.median_delivery_days || 0}d`} trend="up" accentColor="from-accent-purple to-accent-blue" subtitle="Dispatch to delivery" />
                <KpiCard icon={CheckCircle} title="Delivered" value={`${(overall.delivered || 0).toLocaleString()}`} change={`${onTimePct}% of total`} trend="up" accentColor="from-accent-teal to-emerald-400" subtitle="Successfully delivered" />
                <KpiCard icon={AlertCircle} title="Delayed" value={delayed.toLocaleString()} change={`${(overall.returned || 0).toLocaleString()} returned`} trend="down" accentColor="from-amber-500 to-accent-orange" subtitle="Delayed shipments" />
                <KpiCard icon={Truck} title="Total Shipments" value={totalShipments.toLocaleString()} change={`${(overall.in_transit || 0).toLocaleString()} in transit`} trend="up" accentColor="from-accent-blue to-accent-teal" subtitle="Across all carriers" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Avg Delivery by Carrier" subtitle="Days from dispatch to delivery" className="animate-slide-up">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byCarrier} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}d`} />
                                <YAxis dataKey="carrier" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} width={110} />
                                <Tooltip formatter={(value: number) => [`${value} days`, "Avg Delivery"]} contentStyle={{ background: "rgba(15,15,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
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

                <ChartCard title="Delivery Time Distribution" subtitle="Shipment count by delivery days" className="animate-slide-up">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <Tooltip contentStyle={{ background: "rgba(15,15,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                                    {distribution.map((_: any, index: number) => (
                                        <Cell key={index} fill={delayColors[index % delayColors.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {bottlenecks.length > 0 && (
                <ChartCard title="Delivery by Destination" subtitle="Destinations sorted by average delivery time" className="animate-slide-up">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.06]">
                                    <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Destination</th>
                                    <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Avg Days</th>
                                    <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Shipments</th>
                                    <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">On-Time Rate</th>
                                    <th className="text-left text-xs font-medium text-slate-500 pb-3">Bottleneck %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bottlenecks.map((route: any, i: number) => (
                                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                        <td className="py-3 pr-4 text-sm font-medium text-white">{route.city}</td>
                                        <td className="py-3 pr-4">
                                            <span className={`text-sm font-bold ${route.avgDays >= 5 ? "text-red-400" : route.avgDays >= 4 ? "text-amber-400" : "text-emerald-400"}`}>
                                                {route.avgDays}d
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-slate-400">{route.shipments}</td>
                                        <td className="py-3 pr-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full max-w-[80px]">
                                                    <div className="h-1.5 rounded-full bg-gradient-to-r from-accent-purple to-accent-teal" style={{ width: route.onTimeRate }} />
                                                </div>
                                                <span className="text-xs text-slate-400">{route.onTimeRate}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-sm text-amber-400">{route.bottleneckPct}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartCard>
            )}
        </div>
    );
}
