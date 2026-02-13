"use client";

import { useState, useEffect, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    Package,
    RotateCcw,
    AlertTriangle,
    Layers,
    Truck,
    MapPin,
    ArrowUp,
    Activity,
    ShoppingBag,
    XCircle,
    CheckCircle2,
    Clock,
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

const SECTIONS = [
    { id: "kpis", label: "KPIs", icon: Activity },
    { id: "alerts", label: "Reorder Alerts", icon: AlertTriangle },
    { id: "turnover", label: "Turnover", icon: RotateCcw },
    { id: "stockouts", label: "Stockouts", icon: XCircle },
    { id: "delivery", label: "Delivery", icon: Truck },
];

const GlassTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card-static p-3 border border-white/10 max-w-xs">
                <p className="text-xs text-slate-400 mb-1 font-medium">{label}</p>
                {payload.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.stroke }} />
                        <span className="text-xs text-slate-300">{p.name}:</span>
                        <span className="text-xs font-bold text-white">
                            {typeof p.value === "number" && p.value > 1000 ? fmtNum(p.value) : p.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

/* ── Main Page ── */

type ModalType = "stockoutDetail" | "deliveryDetail" | null;

export default function InventoryPage() {
    const { data, loading } = useApi<any>("/api/operations");
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [activeSection, setActiveSection] = useState("kpis");
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [alertFilter, setAlertFilter] = useState<"all" | "stockout" | "low">("all");
    const [alertGroupBy, setAlertGroupBy] = useState<"city" | "category">("city");
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [carrierSort, setCarrierSort] = useState<"ontime" | "shipments" | "avgdays" | "delay">("ontime");

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setShowScrollTop(scrollY > 400);
            for (let i = SECTIONS.length - 1; i >= 0; i--) {
                const el = document.getElementById(SECTIONS[i].id);
                if (el && el.offsetTop - 100 <= scrollY) {
                    setActiveSection(SECTIONS[i].id);
                    break;
                }
            }
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

    const delivery = data.delivery_times?.overall || {};
    const carriers = (data.delivery_times?.by_carrier || []).map((c: any, i: number) => ({
        ...c,
        color: CARRIER_COLORS[i % CARRIER_COLORS.length],
        onTimeRate: (100 - (c.delay_pct || 0)).toFixed(1),
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

    const deliveryModalRows = carriers.map((c: any) => ({
        label: c.carrier,
        value: `${c.avg_days} days avg`,
        subValue: `${fmtNum(c.shipments)} shipments · ${c.delay_pct}% delayed · ${c.onTimeRate}% on-time`,
        color: c.color,
    }));

    // Radar data for stockout
    const maxStockoutPct = Math.max(...stockoutByCategory.map((c: any) => c.pct), 1);
    const stockoutRadar = stockoutByCategory.map((c: any) => ({
        category: c.category,
        "Stockout Rate": Math.round((c.pct / maxStockoutPct) * 100),
    }));

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Package}
                title="Inventory Health"
                subtitle="Stock levels, turnover metrics, delivery tracking & actionable reorder alerts"
            />

            {/* ── Sticky Nav ── */}
            <nav className="sticky top-0 z-40 -mx-8 px-8 py-3" style={{ background: "rgba(10,10,25,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    {SECTIONS.map((s) => {
                        const SIcon = s.icon;
                        const isActive = activeSection === s.id;
                        return (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${isActive
                                    ? "bg-accent-purple/20 text-accent-purple shadow-sm shadow-accent-purple/10"
                                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                                    }`}
                            >
                                <SIcon className="w-3.5 h-3.5" />
                                {s.label}
                            </a>
                        );
                    })}
                </div>
            </nav>

            {/* ── KPI Row ── */}
            <div id="kpis" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
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
                <KpiCard
                    icon={Truck}
                    title="Delivery Performance"
                    value={`${delivery.avg_delivery_days || 0} days`}
                    change={`${fmtNum(delivery.delivered)} delivered · ${delivery.delayed || 0} delayed`}
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle={`${fmtNum(delivery.total_shipments)} total shipments`}
                    onClick={() => setActiveModal("deliveryDetail")}
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
                        <div className="flex items-center gap-2">
                            {/* Filter */}
                            <div className="flex rounded-lg overflow-hidden border border-white/10">
                                {(["all", "stockout", "low"] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setAlertFilter(f)}
                                        className={`px-3 py-1.5 text-[10px] font-semibold uppercase transition-all ${alertFilter === f
                                            ? "bg-accent-purple/30 text-accent-purple"
                                            : "text-slate-500 hover:text-white hover:bg-white/[0.04]"
                                            }`}
                                    >
                                        {f === "all" ? "All" : f === "stockout" ? "🔴 Stockout" : "🟡 Low"}
                                    </button>
                                ))}
                            </div>
                            {/* Group by */}
                            <div className="flex rounded-lg overflow-hidden border border-white/10">
                                {(["city", "category"] as const).map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => { setAlertGroupBy(g); setExpandedGroups(new Set()); }}
                                        className={`px-3 py-1.5 text-[10px] font-semibold uppercase transition-all ${alertGroupBy === g
                                            ? "bg-accent-teal/20 text-accent-teal"
                                            : "text-slate-500 hover:text-white hover:bg-white/[0.04]"
                                            }`}
                                    >
                                        {g === "city" ? "📍 City" : "📦 Category"}
                                    </button>
                                ))}
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
                                    <div key={group} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                                        {/* Group header */}
                                        <button
                                            onClick={() => toggleGroup(group)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-all"
                                            style={{ background: "rgba(255,255,255,0.02)" }}
                                        >
                                            <div className="flex items-center gap-3">
                                                {alertGroupBy === "city" ? (
                                                    <MapPin className="w-4 h-4 text-accent-teal" />
                                                ) : (
                                                    <div className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[group] || "#8b5cf6" }} />
                                                )}
                                                <span className="text-sm font-semibold text-white">{group}</span>
                                                <span className="text-xs text-slate-500">{alerts.length} items</span>
                                                {criticalCount > 0 && (
                                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-red-400 bg-red-400/15">
                                                        {criticalCount} stockout
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400">Cost: <span className="text-white font-semibold">{fmt(groupCost)}</span></span>
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
                                                                    <p className="text-sm font-semibold text-white">{alert.product}</p>
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
                                                        <div className="grid grid-cols-4 gap-3 mb-3">
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 uppercase">On Hand</p>
                                                                <p className={`text-sm font-bold ${alert.isStockout ? "text-red-400" : "text-amber-400"}`}>
                                                                    {alert.currentStock}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 uppercase">Reorder At</p>
                                                                <p className="text-sm font-bold text-white">{alert.reorderPoint}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 uppercase">Order Qty</p>
                                                                <p className="text-sm font-bold text-accent-teal">{alert.suggestedQty}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 uppercase">Cost</p>
                                                                <p className="text-sm font-bold text-white">{fmt(alert.reorderCost)}</p>
                                                            </div>
                                                        </div>

                                                        {/* Stock level bar */}
                                                        <div className="mb-3">
                                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
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
                                                                    <p className="text-xs text-slate-300 leading-relaxed">{alert.resolution}</p>
                                                                    <p className="text-[10px] text-slate-500 mt-1">
                                                                        📋 <span className="text-slate-400">{alert.sourceAction}</span>
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

            {/* ── Row 2: Turnover Chart + Stockout Radar ── */}
            <div id="turnover" className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <ChartCard title="Inventory Turnover by Category" subtitle="Higher ratio = faster cycling — Groceries & Electronics lead">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={turnoverData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}x`} />
                                <Tooltip content={<GlassTooltip />} />
                                <Bar dataKey="turnover" name="Turnover Ratio" radius={[6, 6, 0, 0]} barSize={32}>
                                    {turnoverData.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.color} fillOpacity={0.75} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Category Turnover Details" subtitle="Sold units vs avg inventory by category">
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {turnoverData.map((cat: any, i: number) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-all"
                                style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                                    <div>
                                        <p className="text-sm font-medium text-white">{cat.category}</p>
                                        <p className="text-xs text-slate-500">Avg inv: {fmtNum(cat.avg_inventory)} · Sold: {fmtNum(cat.total_sold)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-white">{cat.turnover}x</p>
                                    <div className="h-1 w-20 rounded-full overflow-hidden mt-1" style={{ background: "rgba(255,255,255,0.06)" }}>
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

            {/* ── Row 3: Stockout by Category ── */}
            <div id="stockouts" className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.15s" }}>
                <ChartCard title="Stockout Rate by Category" subtitle="Percentage of zero-stock records per category">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stockoutByCategory} layout="vertical" margin={{ left: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                                <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} width={100} />
                                <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                                <Bar dataKey="pct" name="Stockout %" radius={[0, 8, 8, 0]} barSize={18}>
                                    {stockoutByCategory.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.color} fillOpacity={0.75} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Stockout Radar" subtitle="Relative stockout severity across categories">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={stockoutRadar} outerRadius="70%">
                                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                <PolarAngleAxis dataKey="category" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Stockout Rate" dataKey="Stockout Rate" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                                <Tooltip contentStyle={{ background: "rgba(15,15,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px" }} formatter={(value: number) => `${value}%`} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* ── Row 4: Delivery Performance ── */}
            <div id="delivery" className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <ChartCard
                    title="🚚 Delivery Performance by Carrier"
                    subtitle={`${fmtNum(delivery.total_shipments)} shipments · ${delivery.avg_delivery_days} days avg · ${fmtNum(delivery.delayed)} delayed`}
                >
                    {/* Delivery summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-white">{fmtNum(delivery.delivered)}</p>
                            <p className="text-[10px] text-slate-500 uppercase">Delivered</p>
                        </div>
                        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                            <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-white">{fmtNum(delivery.in_transit)}</p>
                            <p className="text-[10px] text-slate-500 uppercase">In Transit</p>
                        </div>
                        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                            <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-white">{fmtNum(delivery.delayed)}</p>
                            <p className="text-[10px] text-slate-500 uppercase">Delayed</p>
                        </div>
                        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                            <RotateCcw className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-white">{fmtNum(delivery.returned)}</p>
                            <p className="text-[10px] text-slate-500 uppercase">Returned</p>
                        </div>
                    </div>

                    {/* Sort control */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Sort by</span>
                        {([
                            { key: "ontime", label: "On-Time Rate" },
                            { key: "shipments", label: "Shipments" },
                            { key: "avgdays", label: "Avg Days" },
                            { key: "delay", label: "Delay %" },
                        ] as const).map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setCarrierSort(opt.key)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${carrierSort === opt.key
                                        ? "bg-accent-purple/20 text-accent-purple"
                                        : "text-slate-500 hover:text-white hover:bg-white/[0.04]"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Carrier performance table */}
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                        <table className="w-full">
                            <thead>
                                <tr style={{ background: "rgba(139,92,246,0.06)" }}>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Carrier</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">On-Time Rate</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Shipments</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Avg Days</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Delayed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...carriers]
                                    .sort((a: any, b: any) => {
                                        switch (carrierSort) {
                                            case "ontime": return parseFloat(b.onTimeRate) - parseFloat(a.onTimeRate);
                                            case "shipments": return b.shipments - a.shipments;
                                            case "avgdays": return a.avg_days - b.avg_days;
                                            case "delay": return b.delay_pct - a.delay_pct;
                                            default: return 0;
                                        }
                                    })
                                    .map((carrier: any, i: number) => (
                                        <tr
                                            key={i}
                                            className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-4 py-3 text-xs text-slate-600 font-mono">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Truck className="w-4 h-4" style={{ color: carrier.color }} />
                                                    <span className="text-sm font-semibold text-white">{carrier.carrier}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 w-48">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                                        <div
                                                            className="h-full rounded-full transition-all duration-700"
                                                            style={{
                                                                width: `${carrier.onTimeRate}%`,
                                                                background: parseFloat(carrier.onTimeRate) >= 85
                                                                    ? "#10b981"
                                                                    : parseFloat(carrier.onTimeRate) >= 70
                                                                        ? "#f59e0b"
                                                                        : "#ef4444",
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold w-12 text-right" style={{
                                                        color: parseFloat(carrier.onTimeRate) >= 85
                                                            ? "#10b981"
                                                            : parseFloat(carrier.onTimeRate) >= 70
                                                                ? "#f59e0b"
                                                                : "#ef4444",
                                                    }}>{carrier.onTimeRate}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300 text-right font-mono">{fmtNum(carrier.shipments)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300 text-right font-mono">{carrier.avg_days}d</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-red-400 bg-red-400/10">{carrier.delay_pct}%</span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
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

            <DetailsModal
                open={activeModal === "deliveryDetail"}
                onClose={() => setActiveModal(null)}
                title="Carrier Performance Details"
                icon={Truck}
                accentColor="from-accent-blue to-accent-teal"
                rows={deliveryModalRows}
                footer={`${carriers.length} carriers · ${delivery.avg_delivery_days} days avg delivery`}
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
