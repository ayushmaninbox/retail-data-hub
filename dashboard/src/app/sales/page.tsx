"use client";

import { useState, useEffect, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    BarChart3,
    TrendingUp,
    MapPin,
    Tag,
    Layers,
    Sparkles,
    Store,
    Globe,
    ArrowUp,
    Activity,
    ShoppingBag,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import DetailsModal from "@/components/DetailsModal";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Treemap,
    ComposedChart,
    Line,
} from "recharts";

/* ── Helpers ── */

function fmt(n: number | undefined | null): string {
    const v = n ?? 0;
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    return `₹${v.toLocaleString("en-IN")}`;
}

function fmtShort(n: number | undefined | null): string {
    const v = n ?? 0;
    if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
}

function fmtNum(n: number | undefined | null): string {
    return (n ?? 0).toLocaleString("en-IN");
}

const CITY_COLORS = [
    "#8b5cf6", "#3b82f6", "#14b8a6", "#ec4899", "#f59e0b",
    "#10b981", "#6366f1", "#ef4444", "#06b6d4", "#a855f7",
];

const CATEGORY_COLORS = [
    "#8b5cf6", "#3b82f6", "#14b8a6", "#ec4899",
    "#f59e0b", "#10b981", "#ef4444", "#06b6d4",
];

/* ── Tooltip Components ── */

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
                                {typeof p.value === "number" && p.value > 1000 ? fmt(p.value) : fmtNum(p.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

/* ── Custom Treemap Content ── */

const TreemapContent = (props: any) => {
    const { x, y, width, height, name, revenue, color, index } = props;
    if (width < 30 || height < 20) return null;
    const isSmall = width < 80 || height < 60;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={12}
                fill={color || CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                fillOpacity={0.6}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1.5}
                className="transition-all duration-500 hover:fill-opacity-90 hover:stroke-white/50 cursor-pointer"
            />
            {!isSmall && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - (width > 100 ? 6 : 0)}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={width > 120 ? 12 : 10}
                        fontWeight="700"
                        className="pointer-events-none drop-shadow-sm uppercase tracking-wider"
                    >
                        {name}
                    </text>
                    {width > 100 && (
                        <text
                            x={x + width / 2}
                            y={y + height / 2 + 12}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.8)"
                            fontSize={10}
                            fontWeight="500"
                            className="pointer-events-none"
                        >
                            {fmt(revenue)}
                        </text>
                    )}
                </>
            )}
        </g>
    );
};

/* ── Main Page ── */

type ModalType = "topCity" | "topProduct" | null;

const SECTIONS = [
    { id: "kpis", label: "KPIs", icon: Activity },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "products", label: "Products", icon: ShoppingBag },
    { id: "categories", label: "Categories", icon: Layers },
];

export default function SalesPage() {
    const { data, loading } = useApi<any>("/api/commercial");
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [activeSection, setActiveSection] = useState("kpis");
    const [showScrollTop, setShowScrollTop] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    /* Scroll-spy: detect which section is in view */
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

    const citySales = (data.city_sales || [])
        .filter((c: any) => c.city !== "Online")
        .slice(0, 10)
        .map((c: any, i: number) => ({
            city: c.city,
            revenue: c.revenue,
            transactions: c.transactions,
            units: c.units_sold,
            customers: c.unique_customers,
            region: c.region,
            color: CITY_COLORS[i],
        }));

    const topByRevenue = (data.top_products?.top_by_revenue || []).slice(0, 10).map((p: any, i: number) => ({
        name: p.product_name?.length > 20 ? p.product_name.substring(0, 18) + "…" : p.product_name,
        fullName: p.product_name,
        revenue: p.revenue,
        qty: p.quantity_sold,
        category: p.category,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

    const sortedCats = [...(data.category_revenue || [])].sort((a, b) => b.revenue - a.revenue);
    const topCats = sortedCats.slice(0, 7);
    const otherCats = sortedCats.slice(7);

    const treemapData = topCats.map((c: any, i: number) => ({
        name: c.category,
        size: c.revenue,
        revenue: c.revenue,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

    if (otherCats.length > 0) {
        treemapData.push({
            name: "Others",
            size: otherCats.reduce((acc: number, curr: any) => acc + curr.revenue, 0),
            revenue: otherCats.reduce((acc: number, curr: any) => acc + curr.revenue, 0),
            color: "#64748b",
        });
    }

    const categories = sortedCats.map((c: any, i: number) => ({
        name: c.category,
        revenue: c.revenue,
        units_sold: c.units_sold,
        transactions: c.transactions,
        avg_price: c.avg_price,
        customers: c.unique_customers,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

    const channelMix = (data.channel_mix || []);
    const posData = channelMix.find((c: any) => c.channel === "POS") || {};
    const webData = channelMix.find((c: any) => c.channel === "Web") || {};

    const monthlyTrend = (data.revenue?.monthly_trend || []).map((m: any) => ({
        month: m.year_month,
        revenue: m.revenue,
        transactions: m.transactions,
        units: m.units_sold,
    }));

    const festive = data.festive_analysis || [];
    const festivePeriod = festive.find((f: any) => f.period?.toLowerCase().includes("festive")) || {};
    const normalPeriod = festive.find((f: any) => f.period?.toLowerCase().includes("normal")) || {};

    const topCity = citySales[0] || {};
    const topProduct = topByRevenue[0] || {};
    const totalRev = data.revenue?.summary?.total_revenue || 0;

    /* ── Modal data ── */

    const cityModalRows = citySales.map((c: any) => ({
        label: c.city,
        value: fmt(c.revenue),
        subValue: `${fmtNum(c.transactions)} txns · ${fmtNum(c.customers)} customers · ${c.region}`,
        color: c.color,
        percentage: totalRev > 0 ? (c.revenue / totalRev) * 100 : 0,
    }));

    const productModalRows = topByRevenue.map((p: any) => ({
        label: p.fullName,
        value: fmt(p.revenue),
        subValue: `${fmtNum(p.qty)} units · ${p.category}`,
        color: p.color,
    }));

    return (
        <div className="space-y-6" ref={containerRef}>
            <PageHeader
                icon={BarChart3}
                title="Sales Analytics"
                subtitle="Deep dive into revenue streams, product mix & geographic performance"
            />

            {/* ── KPI Row ── */}
            <div id="kpis" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard
                    icon={Activity}
                    title="Total Revenue"
                    value={fmt(totalRev)}
                    change={`${fmtNum(data.revenue?.summary?.total_transactions || 0)} txns`}
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="All time"
                />
                <KpiCard
                    icon={MapPin}
                    title="Top City"
                    value={topCity.city || "N/A"}
                    change={fmt(topCity.revenue || 0)}
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="Highest revenue"
                    onClick={() => setActiveModal("topCity")}
                />
                <KpiCard
                    icon={ShoppingBag}
                    title="Top Product"
                    value={topProduct.name || "N/A"}
                    change={`${fmtNum(topProduct.qty || 0)} units`}
                    trend="up"
                    accentColor="from-accent-teal to-emerald-400"
                    subtitle="Most sold"
                    onClick={() => setActiveModal("topProduct")}
                />
                <KpiCard
                    icon={Sparkles}
                    title="Festive Uplift"
                    value={
                        festivePeriod.avg_daily_revenue && normalPeriod.avg_daily_revenue
                            ? `${(((festivePeriod.avg_daily_revenue - normalPeriod.avg_daily_revenue) / normalPeriod.avg_daily_revenue) * 100).toFixed(1)}%`
                            : "N/A"
                    }
                    change={`Sales up from daily normal`}
                    trend={festivePeriod.avg_daily_revenue > normalPeriod.avg_daily_revenue ? "up" : "down"}
                    accentColor="from-accent-pink to-accent-orange"
                    subtitle="Oct–Jan vs rest (Daily Avg)"
                />
            </div>

            {/* ── Trend & Channel Side-by-Side ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.05s" }}>
                <div id="trends">
                    <ChartCard
                        title="Revenue & Transactions Trend"
                        subtitle="Monthly dual-axis performance"
                    >
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={monthlyTrend}>
                                    <defs>
                                        <linearGradient id="salesRevGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <YAxis
                                        yAxisId="left"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 10 }}
                                        tickFormatter={(v) => `₹${fmtShort(v)}`}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 10 }}
                                        tickFormatter={(v) => fmtShort(v)}
                                    />
                                    <Tooltip content={<GlassTooltip />} />
                                    <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#salesRevGrad)" />
                                    <Line yAxisId="right" type="monotone" dataKey="transactions" name="Transactions" stroke="#14b8a6" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>
                </div>

                <div id="products">
                    <ChartCard title="Channel Comparison" subtitle="POS (In-Store) vs Web (Online)">
                        <div className="space-y-4 pt-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* POS */}
                                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Store className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs font-bold text-slate-700">POS</span>
                                        <span className="ml-auto text-xs font-bold text-purple-500">{posData.revenue_pct || 0}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Revenue</p>
                                        <p className="text-xs font-bold text-slate-900">{fmt(posData.revenue || 0)}</p>
                                    </div>
                                </div>
                                {/* Web */}
                                <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Globe className="w-4 h-4 text-teal-400" />
                                        <span className="text-xs font-bold text-slate-700">WEB</span>
                                        <span className="ml-auto text-xs font-bold text-teal-500">{webData.revenue_pct || 0}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Revenue</p>
                                        <p className="text-xs font-bold text-slate-900">{fmt(webData.revenue || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Split</p>
                                    <span className="text-[10px] font-bold text-slate-700">{posData.revenue_pct || 50}% / {webData.revenue_pct || 50}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 flex overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{ width: `${posData.revenue_pct || 50}%` }} />
                                    <div className="h-full bg-teal-500" style={{ width: `${webData.revenue_pct || 50}%` }} />
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[10px] font-bold text-slate-700 uppercase">Festive Uplift</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-slate-500">Revenue Uplift</p>
                                        <p className="text-sm font-bold text-emerald-600">
                                            +{(((festivePeriod.avg_daily_revenue - normalPeriod.avg_daily_revenue) / Math.max(normalPeriod.avg_daily_revenue, 1)) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500">Festive Revenue</p>
                                        <p className="text-xs font-bold text-slate-900">{fmt(festivePeriod.total_revenue || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ChartCard>
                </div>
            </div>

            {/* ── Category Detail Cards ── */}
            <div id="categories" className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-accent-purple" />
                    <h3 className="text-sm font-semibold text-slate-800">Category Breakdown</h3>
                    <span className="text-xs text-slate-500">— {categories.length} categories</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {categories.map((cat: any, i: number) => (
                        <div
                            key={i}
                            className="p-4 rounded-xl transition-all hover:scale-[1.02] group"
                            style={{
                                background: `linear-gradient(135deg, ${cat.color}15, ${cat.color}10)`,
                                border: `1px solid ${cat.color}30`,
                            }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                                <p className="text-xs font-bold text-slate-950 truncate">{cat.name}</p>
                            </div>
                            <p className="text-lg font-bold text-slate-950 mb-1">{fmt(cat.revenue)}</p>
                            <div className="flex gap-3 text-xs text-slate-700 font-medium">
                                <span>{fmtNum(cat.units_sold)} units</span>
                                <span>·</span>
                                <span>Avg ₹{cat.avg_price?.toLocaleString("en-IN")}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Modals ── */}
            <DetailsModal
                open={activeModal === "topCity"}
                onClose={() => setActiveModal(null)}
                title="All Cities — Revenue Ranking"
                icon={MapPin}
                accentColor="from-accent-blue to-accent-teal"
                rows={cityModalRows}
                footer="Revenue breakdown across all cities with region info"
            />

            <DetailsModal
                open={activeModal === "topProduct"}
                onClose={() => setActiveModal(null)}
                title="Top 10 Products — Revenue"
                icon={Tag}
                accentColor="from-accent-teal to-emerald-400"
                rows={productModalRows}
                footer="Top products by revenue across all channels"
            />

            {/* ── Scroll to Top Button ── */}
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
