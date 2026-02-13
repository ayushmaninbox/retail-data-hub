"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    Truck,
    Clock,
    CheckCircle,
    AlertCircle,
    AlertTriangle,
    RotateCcw,
    Package,
    ArrowUp,
    ChevronDown,
    MapPin,
    Timer,
    TrendingDown,
    XCircle,
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
    Cell,
    PieChart,
    Pie,
    Legend,
} from "recharts";

/* ── Helpers ── */

const CARRIER_COLORS = ["#8b5cf6", "#3b82f6", "#14b8a6", "#f59e0b", "#ef4444", "#ec4899", "#6b7280"];

function fmtNum(n: number | undefined | null): string {
    return (n ?? 0).toLocaleString("en-IN");
}



/* ── Drill-Down Panel ── */

type DrillType = "delayed" | "delivered" | "intransit" | "returned" | null;

function DrillDownPanel({
    drill,
    carriers,
    overall,
    onClose,
}: {
    drill: DrillType;
    carriers: any[];
    overall: any;
    onClose: () => void;
}) {
    if (!drill) return null;

    const config: Record<string, { title: string; icon: any; color: string; field: string; pctField: string; description: string }> = {
        delayed: {
            title: "Delayed Shipments by Carrier",
            icon: AlertTriangle,
            color: "#ef4444",
            field: "delayed",
            pctField: "delay_pct",
            description: "Shipments that exceeded the expected delivery window",
        },
        delivered: {
            title: "Delivered Shipments by Carrier",
            icon: CheckCircle,
            color: "#10b981",
            field: "delivered",
            pctField: "",
            description: "Successfully delivered to destination",
        },
        intransit: {
            title: "In-Transit Shipments by Carrier",
            icon: Truck,
            color: "#f59e0b",
            field: "in_transit",
            pctField: "",
            description: "Currently in transit to destination",
        },
        returned: {
            title: "Returned Shipments by Carrier",
            icon: RotateCcw,
            color: "#8b5cf6",
            field: "returned",
            pctField: "",
            description: "Shipments returned to sender",
        },
    };

    const cfg = config[drill];
    const CfgIcon = cfg.icon;

    // Sort carriers by the relevant field (descending)
    const sorted = [...carriers]
        .map((c, i) => {
            const val = Number(c[cfg.field] ?? c[cfg.field.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] ?? 0);
            return {
                ...c,
                value: val,
                pct: c.shipments > 0 ? (val / c.shipments * 100).toFixed(1) : "0",
                color: CARRIER_COLORS[i % CARRIER_COLORS.length],
            };
        })
        .sort((a, b) => b.value - a.value);

    const totalField = sorted.reduce((s, c) => s + c.value, 0);

    // Pie data
    const pieData = sorted.filter(c => c.value > 0).map(c => ({
        name: c.carrier,
        value: c.value,
        fill: c.color,
    }));

    return (
        <div className="glass-card-static p-6 animate-slide-up">
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}15` }}>
                        <CfgIcon className="w-5 h-5" style={{ color: cfg.color }} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">{cfg.title}</h3>
                        <p className="text-xs text-slate-500">{cfg.description} · <span className="font-semibold" style={{ color: cfg.color }}>{fmtNum(totalField)}</span> total</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-black/[0.04] transition-all"
                >
                    <XCircle className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Carrier breakdown table */}
                <div className="xl:col-span-2">
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                        <table className="w-full">
                            <thead>
                                <tr style={{ background: `${cfg.color}08` }}>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Carrier</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Count</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Share</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Shipments</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((c, i) => {
                                    const share = totalField > 0 ? (c.value / totalField * 100).toFixed(1) : "0";
                                    return (
                                        <tr key={i} className="border-t border-black/[0.04] hover:bg-black/[0.02] transition-colors">
                                            <td className="px-4 py-3 text-xs text-slate-600 font-mono">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                                                    <span className="text-sm font-semibold text-slate-800">{c.carrier}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-bold" style={{ color: cfg.color }}>{fmtNum(c.value)}</span>
                                            </td>
                                            <td className="px-4 py-3 w-36">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${share}%`, background: c.color }} />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 w-10 text-right">{share}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-400 text-right font-mono">{fmtNum(c.shipments)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${drill === "delivered" ? "text-emerald-400 bg-emerald-400/10" :
                                                    drill === "delayed" ? "text-red-400 bg-red-400/10" :
                                                        drill === "returned" ? "text-purple-400 bg-purple-400/10" :
                                                            "text-amber-400 bg-amber-400/10"
                                                    }`}>{c.pct}%</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pie chart */}
                <div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="50%"
                                    outerRadius="80%"
                                    dataKey="value"
                                    stroke="rgba(0,0,0,0.3)"
                                    strokeWidth={1}
                                >
                                    {pieData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number, name: string) => [fmtNum(value), name]}
                                    contentStyle={{
                                        background: "rgba(15,23,42,0.9)",
                                        backdropFilter: "blur(12px)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                        color: "#fff",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        padding: "10px 14px",
                                        zIndex: 9999,
                                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                                    }}
                                    wrapperStyle={{ zIndex: 9999 }}
                                    itemStyle={{ color: "#fff", fontSize: "12px" }}
                                    labelStyle={{ color: "#94a3b8", fontSize: "11px", marginBottom: "4px" }}
                                />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Main Page ── */

export default function LogisticsPage() {
    const { data, loading } = useApi<any>("/api/operations");
    const [activeDrill, setActiveDrill] = useState<DrillType>(null);

    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);

        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (loading || !data) return <PageSkeleton />;

    const overall = data.delivery_times?.overall || {};
    const byCarrier = data.delivery_times?.by_carrier || [];
    const carrierChart = byCarrier.map((c: any, i: number) => ({
        carrier: c.carrier,
        avgDays: c.avg_days,
        shipments: c.shipments,
        delayed: c.delayed,
        delayPct: c.delay_pct,
        color: CARRIER_COLORS[i % CARRIER_COLORS.length],
        onTimeRate: (100 - (c.delay_pct || 0)).toFixed(1),
    }));

    const distribution = (data.delivery_times?.distribution || []).map((d: any) => ({
        bucket: `${d.days}d`,
        count: d.shipments,
    }));

    const bottlenecks = (data.delivery_times?.by_destination || [])
        .sort((a: any, b: any) => b.avg_days - a.avg_days)
        .slice(0, 8)
        .map((d: any) => ({
            city: d.destination_city,
            avgDays: d.avg_days,
            shipments: d.shipments,
            bottleneck: d.bottleneck_shipments,
            bottleneckPct: d.bottleneck_pct,
            onTimeRate: (100 - (d.bottleneck_pct || 0)).toFixed(1),
        }));

    const totalShipments = overall.total_shipments || 0;
    const delayed = overall.delayed || 0;
    const delivered = overall.delivered || 0;
    const inTransit = overall.in_transit || 0;
    const returned = overall.returned || 0;
    const onTimePct = totalShipments > 0 ? ((delivered / totalShipments) * 100).toFixed(1) : "0";

    const handleDrill = (type: DrillType) => {
        setActiveDrill(activeDrill === type ? null : type);
        if (activeDrill !== type) {
            setTimeout(() => {
                document.getElementById("drill-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader icon={Truck} title="Logistics" subtitle="Delivery performance, delay analysis & route bottlenecks" />



            {/* ── KPI Cards (clickable) ── */}
            <div id="kpis" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <div onClick={() => handleDrill("delivered")} className={`cursor-pointer rounded-2xl transition-all hover:scale-[1.02] ${activeDrill === "delivered" ? "ring-2 ring-emerald-500/40" : ""}`}>
                    <KpiCard
                        icon={CheckCircle}
                        title="Delivered"
                        value={fmtNum(delivered)}
                        change={`${onTimePct}% of total`}
                        trend="up"
                        accentColor="from-accent-teal to-emerald-400"
                        subtitle="Click to see carrier breakdown"
                    />
                </div>
                <div onClick={() => handleDrill("delayed")} className={`cursor-pointer rounded-2xl transition-all hover:scale-[1.02] ${activeDrill === "delayed" ? "ring-2 ring-red-500/40" : ""}`}>
                    <KpiCard
                        icon={AlertCircle}
                        title="Delayed"
                        value={fmtNum(delayed)}
                        change={`${totalShipments > 0 ? ((delayed / totalShipments) * 100).toFixed(1) : 0}% delay rate`}
                        trend="down"
                        accentColor="from-red-500 to-accent-orange"
                        subtitle="Click to see carrier breakdown"
                    />
                </div>
                <div onClick={() => handleDrill("intransit")} className={`cursor-pointer rounded-2xl transition-all hover:scale-[1.02] ${activeDrill === "intransit" ? "ring-2 ring-amber-500/40" : ""}`}>
                    <KpiCard
                        icon={Truck}
                        title="In Transit"
                        value={fmtNum(inTransit)}
                        change={`Avg ${overall.avg_delivery_days || 0} days`}
                        trend="up"
                        accentColor="from-amber-500 to-yellow-400"
                        subtitle="Click to see carrier breakdown"
                    />
                </div>
                <div onClick={() => handleDrill("returned")} className={`cursor-pointer rounded-2xl transition-all hover:scale-[1.02] ${activeDrill === "returned" ? "ring-2 ring-purple-500/40" : ""}`}>
                    <KpiCard
                        icon={RotateCcw}
                        title="Returned"
                        value={fmtNum(returned)}
                        change={`${totalShipments > 0 ? ((returned / totalShipments) * 100).toFixed(1) : 0}% return rate`}
                        trend="down"
                        accentColor="from-accent-purple to-violet-400"
                        subtitle="Click to see carrier breakdown"
                    />
                </div>
            </div>

            {/* ── Drill-Down Panel ── */}
            <div id="drill-panel">
                <DrillDownPanel
                    drill={activeDrill}
                    carriers={byCarrier}
                    overall={overall}
                    onClose={() => setActiveDrill(null)}
                />
            </div>

            {/* ── Carrier Performance ── */}
            <div id="carriers" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Avg Delivery by Carrier" subtitle="Days from dispatch to delivery" className="animate-slide-up">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={carrierChart} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}d`} />
                                <YAxis dataKey="carrier" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} width={110} />
                                <Tooltip
                                    formatter={(value: number) => [`${value} days`, "Avg Delivery"]}
                                    contentStyle={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", color: "#334155", fontSize: "12px" }}
                                />
                                <Bar dataKey="avgDays" radius={[0, 6, 6, 0]} barSize={18}>
                                    {carrierChart.map((c: any, i: number) => (
                                        <Cell key={i} fill={c.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Carrier ranked table */}
                <ChartCard title="Carrier Rankings" subtitle="Sorted by on-time performance" className="animate-slide-up">
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                        <table className="w-full">
                            <thead>
                                <tr style={{ background: "rgba(139,92,246,0.06)" }}>
                                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-6">#</th>
                                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Carrier</th>
                                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">On-Time</th>
                                    <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Delayed</th>
                                    <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Avg</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...carrierChart]
                                    .sort((a: any, b: any) => parseFloat(b.onTimeRate) - parseFloat(a.onTimeRate))
                                    .map((c: any, i: number) => (
                                        <tr key={i} className="border-t border-black/[0.04] hover:bg-black/[0.02] transition-colors">
                                            <td className="px-3 py-2.5 text-xs text-slate-600 font-mono">{i + 1}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                                                    <span className="text-xs font-semibold text-slate-800">{c.carrier}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 w-32">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${c.onTimeRate}%`,
                                                                background: parseFloat(c.onTimeRate) >= 85 ? "#10b981" : parseFloat(c.onTimeRate) >= 70 ? "#f59e0b" : "#ef4444",
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold" style={{
                                                        color: parseFloat(c.onTimeRate) >= 85 ? "#10b981" : parseFloat(c.onTimeRate) >= 70 ? "#f59e0b" : "#ef4444",
                                                    }}>{c.onTimeRate}%</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <span className="text-xs font-semibold text-red-400">{c.delayPct}%</span>
                                            </td>
                                            <td className="px-3 py-2.5 text-right text-xs text-slate-400 font-mono">{c.avgDays}d</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </ChartCard>
            </div>

            {/* ── Distribution ── */}
            <div id="distribution">
                <ChartCard title="Delivery Time Distribution" subtitle="Shipment count by delivery days" className="animate-slide-up">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <Tooltip contentStyle={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", color: "#334155", fontSize: "12px" }} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                                    {distribution.map((_: any, index: number) => (
                                        <Cell key={index} fill={CARRIER_COLORS[index % CARRIER_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* ── Destinations ── */}
            {bottlenecks.length > 0 && (
                <div id="destinations">
                    <ChartCard title="Delivery by Destination" subtitle="Top destinations by avg delivery time — click slow routes for details" className="animate-slide-up">
                        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                            <table className="w-full">
                                <thead>
                                    <tr style={{ background: "rgba(139,92,246,0.06)" }}>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">#</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Destination</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Avg Days</th>
                                        <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Shipments</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">On-Time Rate</th>
                                        <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Bottleneck</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bottlenecks.map((route: any, i: number) => (
                                        <tr key={i} className="border-t border-black/[0.04] hover:bg-black/[0.02] transition-colors">
                                            <td className="px-4 py-3 text-xs text-slate-600 font-mono">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                                    <span className="text-sm font-semibold text-slate-800">{route.city}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-sm font-bold ${route.avgDays >= 5 ? "text-red-400" : route.avgDays >= 4 ? "text-amber-400" : "text-emerald-400"
                                                    }`}>
                                                    {route.avgDays}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-400 text-right font-mono">{fmtNum(route.shipments)}</td>
                                            <td className="px-4 py-3 w-40">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-black/[0.06] rounded-full">
                                                        <div
                                                            className="h-2 rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${route.onTimeRate}%`,
                                                                background: parseFloat(route.onTimeRate) >= 80 ? "#10b981" : parseFloat(route.onTimeRate) >= 60 ? "#f59e0b" : "#ef4444",
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 w-10 text-right">{route.onTimeRate}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-xs font-semibold text-red-400">{route.bottleneckPct}%</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ChartCard>
                </div>
            )}

            {/* ── Scroll to Top ── */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className={`fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-accent-purple/90 text-white flex items-center justify-center shadow-lg shadow-accent-purple/30 transition-all duration-300 hover:bg-accent-purple hover:scale-110 ${showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                    }`}
            >
                <ArrowUp className="w-4 h-4" />
            </button>
        </div>
    );
}
