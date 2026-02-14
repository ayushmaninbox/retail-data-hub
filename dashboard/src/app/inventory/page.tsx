"use client";

import { useState, useEffect, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    Package,
    RotateCcw,
    AlertTriangle,
    Layers,
    MapPin,
    ArrowUp,
    Activity,
    ShoppingBag,
    XCircle,
    ChevronDown,
    ChevronUp,
    IndianRupee,
    AlertOctagon,
    PackageCheck,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import DetailsModal from "@/components/DetailsModal";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Legend,
    Cell,
    ComposedChart,
    Line,
    Area,
} from "recharts";

/* ── Helpers ── */

function fmt(n: number | undefined | null): string {
    const v = n ?? 0;
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    return `₹${v.toLocaleString("en-IN")}`;
}

function fmtNum(n: number | undefined | null): string {
    return (n ?? 0).toLocaleString("en-IN");
}

const CATEGORY_COLORS: Record<string, string> = {
    Beauty: "#ec4899",
    Toys: "#f59e0b",
    Groceries: "#10b981",
    Electronics: "#3b82f6",
    Books: "#8b5cf6",
    Sports: "#06b6d4",
    Clothing: "#ef4444",
    "Home & Kitchen": "#a855f7",
};

const CARRIER_COLORS = ["#8b5cf6", "#3b82f6", "#14b8a6", "#ec4899", "#f59e0b", "#ef4444", "#06b6d4"];



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
                            <span className="text-sm font-black text-white">
                                {typeof p.value === "number" && p.value > 1000 ? fmtNum(p.value) : p.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

/* ── Main Page ── */

type ModalType = "stockoutDetail" | null;

export default function InventoryPage() {
    const { data, loading } = useApi<any>("/api/operations");
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [invMetric, setInvMetric] = useState<"turnover" | "stockout">("turnover");

    const [showScrollTop, setShowScrollTop] = useState(false);
    const [alertFilter, setAlertFilter] = useState<"all" | "stockout" | "low">("all");
    const [alertGroupBy, setAlertGroupBy] = useState<"city" | "category">("city");
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setShowScrollTop(scrollY > 400);

        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (loading || !data) return <PageSkeleton />;

    /* ── Data prep ── */

    const turnoverData = (data.inventory_turnover?.by_category || []).map((c: any) => ({
        category: c.category,
        turnover: c.turnover_ratio,
        total_sold: c.total_sold,
        avg_inventory: c.avg_inventory,
        color: CATEGORY_COLORS[c.category] || "#8b5cf6",
    }));

    const stockout = data.stockout_rate?.overall || {};
    const stockoutByCategory = (data.stockout_rate?.by_category || []).map((c: any) => ({
        category: c.category,
        total: c.total_records,
        stockouts: c.stockout_records,
        pct: c.stockout_pct,
        color: CATEGORY_COLORS[c.category] || "#8b5cf6",
    }));


    const allAlerts = (data.reorder_alerts || []).map((r: any) => ({
        product: r.product_name,
        currentStock: r.quantity_on_hand,
        reorderPoint: r.reorder_level,
        suggestedQty: r.units_to_order,
        unitCost: r.unit_cost,
        reorderCost: r.reorder_cost,
        category: r.category,
        city: r.store_city,
        storeId: r.store_id,
        isStockout: r.quantity_on_hand === 0,
        priority: r.quantity_on_hand === 0 ? "Critical" : r.quantity_on_hand < r.reorder_level / 2 ? "High" : "Medium",
        // Resolution info
        resolution: r.quantity_on_hand === 0
            ? `Immediately order ${r.units_to_order} units from supplier. Estimated cost: ${fmt(r.reorder_cost)}. Check nearby stores in ${r.store_city} for emergency stock transfer.`
            : `Schedule reorder of ${r.units_to_order} units before stock depletes. Current runway: ~${Math.max(1, Math.floor(r.quantity_on_hand / Math.max(1, (r.reorder_level - r.quantity_on_hand))))} days.`,
        sourceAction: r.quantity_on_hand === 0
            ? `Transfer from nearest ${r.store_city} store or place emergency PO`
            : `Place standard PO — ${r.units_to_order} units at ₹${r.unit_cost?.toLocaleString("en-IN")}/unit`,
    }));

    const filteredAlerts = allAlerts.filter((a: any) => {
        if (alertFilter === "stockout") return a.isStockout;
        if (alertFilter === "low") return !a.isStockout;
        return true;
    });

    // Group alerts
    const groupedAlerts: Record<string, any[]> = {};
    filteredAlerts.forEach((a: any) => {
        const key = alertGroupBy === "city" ? a.city : a.category;
        if (!groupedAlerts[key]) groupedAlerts[key] = [];
        groupedAlerts[key].push(a);
    });

    // Auto-expand all groups initially
    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const isExpanded = (key: string) => expandedGroups.has(key) || expandedGroups.size === 0;

    const avgTurnover = turnoverData.length > 0
        ? (turnoverData.reduce((s: number, c: any) => s + c.turnover, 0) / turnoverData.length).toFixed(1)
        : "0";

    const totalReorderCost = allAlerts.reduce((s: number, a: any) => s + (a.reorderCost || 0), 0);
    const stockoutCount = allAlerts.filter((a: any) => a.isStockout).length;

    /* ── Modal data ── */

    const stockoutModalRows = stockoutByCategory.map((c: any) => ({
        label: c.category,
        value: `${c.pct}%`,
        subValue: `${fmtNum(c.stockouts)} out of ${fmtNum(c.total)} records`,
        color: c.color,
        percentage: c.pct * (100 / Math.max(...stockoutByCategory.map((s: any) => s.pct), 1)),
    }));



    // CLV stats summary
    const clvStats = data.clv?.overall_stats || {};

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Package}
                title="Inventory Health"
                subtitle="Stock levels, turnover metrics, delivery tracking & actionable reorder alerts"
            />



            {/* ── KPI Row ── */}
            <div id="kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 animate-slide-up">
                <KpiCard
                    icon={RotateCcw}
                    title="Avg Turnover Ratio"
                    value={`${avgTurnover}x`}
                    change="Across all categories"
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="Higher is better"
                />
                <KpiCard
                    icon={AlertTriangle}
                    title="Stockout Rate"
                    value={`${stockout.stockout_pct || 0}%`}
                    change={`${fmtNum(stockout.stockout_records)} records`}
                    trend="down"
                    accentColor="from-red-500 to-accent-orange"
                    subtitle="Products at zero stock"
                    onClick={() => setActiveModal("stockoutDetail")}
                />
                <KpiCard
                    icon={AlertOctagon}
                    title="Reorder Alerts"
                    value={`${allAlerts.length}`}
                    change={`${stockoutCount} critical · ${fmt(totalReorderCost)} cost`}
                    trend="down"
                    accentColor="from-amber-500 to-accent-orange"
                    subtitle="Action needed"
                />
            </div>

            {/* ══════════════════════════════════════════════════════════
                REORDER ALERTS — Grouped, filterable, with resolution
               ══════════════════════════════════════════════════════════ */}
            <div id="alerts" className="animate-slide-up" style={{ animationDelay: "0.05s" }}>
                <ChartCard
                    title="⚠️ Reorder Alerts — Actionable Breakdown"
                    subtitle={`${allAlerts.length} items need attention · Total reorder cost: ${fmt(totalReorderCost)}`}
                    action={
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Filter Segmented Control */}
                            <div className="flex p-0.5 rounded-xl bg-black/[0.04] border border-black/[0.06] backdrop-blur-md">
                                {([
                                    { id: "all", label: "All", icon: "💎", color: "bg-accent-purple/20 text-accent-purple" },
                                    { id: "stockout", label: "Stockout", icon: "🔴", color: "bg-red-500/15 text-red-500" },
                                    { id: "low", label: "Low", icon: "🟡", color: "bg-amber-500/15 text-amber-500" }
                                ] as const).map((f) => {
                                    const isActive = alertFilter === f.id;
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => setAlertFilter(f.id)}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all duration-300 rounded-lg flex items-center gap-1.5 ${isActive
                                                ? `${f.color} shadow-sm scale-[1.02]`
                                                : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                                                }`}
                                        >
                                            {f.icon && <span className="text-xs">{f.icon}</span>}
                                            {f.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Group By Segmented Control */}
                            <div className="flex p-0.5 rounded-xl bg-black/[0.04] border border-black/[0.06] backdrop-blur-md">
                                {[
                                    { id: "city", label: "City", icon: <MapPin className="w-3 h-3" />, color: "bg-accent-teal/15 text-accent-teal" },
                                    { id: "category", label: "Category", icon: <Package className="w-3 h-3" />, color: "bg-accent-teal/15 text-accent-teal" }
                                ].map((g) => {
                                    const isActive = alertGroupBy === g.id;
                                    return (
                                        <button
                                            key={g.id}
                                            onClick={() => { setAlertGroupBy(g.id as any); setExpandedGroups(new Set()); }}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all duration-300 rounded-lg flex items-center gap-2 ${isActive
                                                ? `${g.color} shadow-sm scale-[1.02]`
                                                : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                                                }`}
                                        >
                                            <span className={`${isActive ? "text-accent-teal" : "text-slate-400"}`}>{g.icon}</span>
                                            {g.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {Object.entries(groupedAlerts)
                            .sort((a, b) => b[1].length - a[1].length)
                            .map(([group, alerts]) => {
                                const criticalCount = alerts.filter((a: any) => a.isStockout).length;
                                const groupCost = alerts.reduce((s: number, a: any) => s + (a.reorderCost || 0), 0);
                                const expanded = isExpanded(group);

                                return (
                                    <div key={group} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                                        {/* Group header */}
                                        <button
                                            onClick={() => toggleGroup(group)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-black/[0.02] transition-all"
                                            style={{ background: "rgba(0,0,0,0.02)" }}
                                        >
                                            <div className="flex items-center gap-3">
                                                {alertGroupBy === "city" ? (
                                                    <MapPin className="w-4 h-4 text-accent-teal" />
                                                ) : (
                                                    <div className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[group] || "#8b5cf6" }} />
                                                )}
                                                <span className="text-sm font-semibold text-slate-800">{group}</span>
                                                <span className="text-xs text-slate-500">{alerts.length} items</span>
                                                {criticalCount > 0 && (
                                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-red-400 bg-red-400/15">
                                                        {criticalCount} stockout
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400">Cost: <span className="text-slate-800 font-semibold">{fmt(groupCost)}</span></span>
                                                {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                            </div>
                                        </button>

                                        {/* Alert cards */}
                                        {expanded && (
                                            <div className="px-4 pb-4 space-y-2">
                                                {alerts.map((alert: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        className={`p-4 rounded-xl transition-all ${alert.isStockout
                                                            ? "border border-red-500/20 bg-red-500/[0.04]"
                                                            : "border border-amber-500/15 bg-amber-500/[0.03]"
                                                            }`}
                                                    >
                                                        {/* Top row */}
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                {alert.isStockout ? (
                                                                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                                ) : (
                                                                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                                                )}
                                                                <div>
                                                                    <p className="text-sm font-semibold text-slate-800">{alert.product}</p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {alertGroupBy === "city" ? alert.category : alert.city} · {alert.storeId}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${alert.priority === "Critical"
                                                                ? "text-red-400 bg-red-400/20"
                                                                : alert.priority === "High"
                                                                    ? "text-orange-400 bg-orange-400/20"
                                                                    : "text-amber-400 bg-amber-400/20"
                                                                }`}>
                                                                {alert.priority}
                                                            </span>
                                                        </div>

                                                        {/* Metrics row */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 uppercase">On Hand</p>
                                                                <p className={`text-sm font-bold ${alert.isStockout ? "text-red-400" : "text-amber-400"}`}>
                                                                    {alert.currentStock}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 uppercase">Reorder At</p>
                                                                <p className="text-sm font-bold text-slate-800">{alert.reorderPoint}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 uppercase">Order Qty</p>
                                                                <p className="text-sm font-bold text-accent-teal">{alert.suggestedQty}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 uppercase">Cost</p>
                                                                <p className="text-sm font-bold text-slate-800">{fmt(alert.reorderCost)}</p>
                                                            </div>
                                                        </div>

                                                        {/* Stock level bar */}
                                                        <div className="mb-3">
                                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-500"
                                                                    style={{
                                                                        width: `${Math.min(100, alert.reorderPoint > 0 ? (alert.currentStock / alert.reorderPoint) * 100 : 0)}%`,
                                                                        background: alert.isStockout ? "#ef4444" : alert.currentStock < alert.reorderPoint / 2 ? "#f59e0b" : "#10b981",
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Resolution */}
                                                        <div className="p-3 rounded-lg" style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.12)" }}>
                                                            <div className="flex items-start gap-2">
                                                                <PackageCheck className="w-3.5 h-3.5 text-accent-teal mt-0.5 flex-shrink-0" />
                                                                <div>
                                                                    <p className="text-[10px] font-semibold text-accent-teal uppercase mb-0.5">Resolution</p>
                                                                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{alert.resolution}</p>
                                                                    <p className="text-[10px] text-slate-600 mt-1">
                                                                        📋 <span className="text-slate-500 font-bold">{alert.sourceAction}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </ChartCard>
            </div>

            {/* ── Row 2: Merged Performance Chart + Details ── */}
            <div id="performance" className="grid grid-cols-1 xl:grid-cols-5 gap-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <ChartCard
                    title="Inventory Performance"
                    subtitle={invMetric === "turnover" ? "Turnover Ratio — Higher is better" : "Stockout Rate — Percentage of zero-stock records"}
                    className="xl:col-span-3 transition-all duration-500"
                    action={
                        <div className="flex p-1 rounded-xl bg-black/[0.04] border border-black/[0.08] backdrop-blur-md">
                            {(["turnover", "stockout"] as const).map((m) => {
                                const isActive = invMetric === m;
                                return (
                                    <button
                                        key={m}
                                        onClick={() => setInvMetric(m)}
                                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 rounded-lg flex items-center gap-2 ${isActive
                                            ? "bg-white shadow-sm text-slate-900 scale-[1.02]"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                                            }`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? (m === "turnover" ? "bg-accent-purple" : "bg-red-500") : "bg-transparent"}`} />
                                        {m === "turnover" ? "Turnover" : "Stockouts"}
                                    </button>
                                );
                            })}
                        </div>
                    }
                >
                    <div className="h-64 lg:h-80 relative overflow-hidden" key={invMetric}>
                        <div className="absolute inset-0 animate-slide-up">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={invMetric === "turnover" ? turnoverData : stockoutByCategory} layout={invMetric === "stockout" ? "vertical" : "horizontal"} margin={invMetric === "stockout" ? { left: 10, right: 20 } : { bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={invMetric === "turnover"} horizontal={invMetric === "stockout"} />
                                    {invMetric === "turnover" ? (
                                        <>
                                            <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "#334155", fontSize: 9, fontWeight: 700 }} angle={-30} textAnchor="end" height={60} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#334155", fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => `${v}x`} />
                                            <Bar dataKey="turnover" name="Turnover Ratio" radius={[6, 6, 0, 0]} barSize={24}>
                                                {turnoverData.map((entry: any, index: number) => (
                                                    <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                                                ))}
                                            </Bar>
                                        </>
                                    ) : (
                                        <>
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#334155", fontSize: 9, fontWeight: 700 }} tickFormatter={(v) => `${v}%`} />
                                            <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fill: "#334155", fontSize: 10, fontWeight: 700 }} width={80} />
                                            <Bar dataKey="pct" name="Stockout %" radius={[0, 8, 8, 0]} barSize={14}>
                                                {stockoutByCategory.map((entry: any, index: number) => (
                                                    <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                                                ))}
                                            </Bar>
                                        </>
                                    )}
                                    <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="Category Turnover Details" subtitle="Sold units vs avg inventory" className="xl:col-span-2">
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                        {turnoverData.map((cat: any, i: number) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-black/[0.03] transition-all"
                                style={{ border: "1px solid rgba(0,0,0,0.04)" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{cat.category}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Avg Inv: {fmtNum(cat.avg_inventory)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-800">{cat.turnover}x</p>
                                    <div className="h-1 w-16 rounded-full overflow-hidden mt-1" style={{ background: "rgba(0,0,0,0.06)" }}>
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${Math.min(100, (cat.turnover / Math.max(...turnoverData.map((t: any) => t.turnover), 1)) * 100)}%`,
                                                background: cat.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>


            {/* ── Modals ── */}
            <DetailsModal
                open={activeModal === "stockoutDetail"}
                onClose={() => setActiveModal(null)}
                title="Stockout Rate by Category"
                icon={AlertTriangle}
                accentColor="from-red-500 to-accent-orange"
                rows={stockoutModalRows}
                footer={`Overall stockout rate: ${stockout.stockout_pct}% across ${fmtNum(stockout.total_records)} records`}
            />


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
