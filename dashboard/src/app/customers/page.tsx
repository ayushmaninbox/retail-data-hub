"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    Users,
    Heart,
    UserPlus,
    Star,
    MapPin,
    ArrowUp,
    Crown,
    TrendingUp,
    Target,
    XCircle,
    ChevronRight,
    Award,
    Sparkles,
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
    AreaChart,
    Area,
} from "recharts";

/* ── Colors & Config ── */

const segmentColors: Record<string, string> = {
    Champions: "#8b5cf6",
    "Loyal Customers": "#3b82f6",
    "Potential Loyalist": "#14b8a6",
    "At Risk": "#f97316",
    "Need Attention": "#eab308",
    "New Customers": "#06b6d4",
    Lost: "#6b7280",
};

const CLV_COLORS: Record<string, string> = {
    Platinum: "#8b5cf6",
    Gold: "#f59e0b",
    Silver: "#94a3b8",
    Bronze: "#d97706",
};

const CITY_COLORS = ["#8b5cf6", "#3b82f6", "#14b8a6", "#ec4899", "#f59e0b", "#ef4444", "#06b6d4", "#10b981", "#a855f7", "#6366f1"];

const SECTIONS = [
    { id: "kpis", label: "Overview", icon: Users },
    { id: "segments", label: "RFM Segments", icon: Target },
    { id: "clv", label: "CLV Analysis", icon: Heart },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "cities", label: "Geography", icon: MapPin },
];

/* ── Helpers ── */

function fmt(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n.toLocaleString("en-IN")}`;
}

function fmtNum(n: number | undefined | null): string {
    return (n ?? 0).toLocaleString("en-IN");
}

/* ── Main Page ── */

type SegmentDrill = string | null;

export default function CustomersPage() {
    const { data, loading } = useApi<any>("/api/customers");
    const [activeSection, setActiveSection] = useState("kpis");
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [activeSeg, setActiveSeg] = useState<SegmentDrill>(null);
    const [activeCLV, setActiveCLV] = useState<string | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
            const scrollY = window.scrollY;
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

    // ── Data extraction ──
    const summary = data.new_vs_returning?.summary || {};
    const monthlyNR = (data.new_vs_returning?.monthly_trend || []).map((m: any) => ({
        month: m.year_month,
        new: m.new_customers,
        returning: m.returning_customers,
        total: (m.new_customers || 0) + (m.returning_customers || 0),
    }));

    const clvStats = data.clv?.stats || {};
    const clvSegmentsRaw = data.clv?.segments || {};
    const clvSegments = typeof clvSegmentsRaw === "object" && !Array.isArray(clvSegmentsRaw)
        ? Object.entries(clvSegmentsRaw).map(([seg, count]) => ({
            tier: seg.charAt(0).toUpperCase() + seg.slice(1),
            count: count as number,
            color: CLV_COLORS[seg.charAt(0).toUpperCase() + seg.slice(1)] || "#64748b",
        }))
        : (clvSegmentsRaw as any[]).map((s: any) => ({
            tier: s.segment,
            count: s.count,
            color: CLV_COLORS[s.segment] || "#64748b",
        }));
    const totalCLVCustomers = clvSegments.reduce((s: number, c: any) => s + c.count, 0);

    const rfmSegments = (data.rfm?.segments || []).map((s: any) => ({
        segment: s.segment,
        count: s.count,
        avg_monetary: s.avg_monetary,
        avg_recency: s.avg_recency,
        avg_frequency: s.avg_frequency,
        color: segmentColors[s.segment] || "#64748b",
    }));
    const topCustomers = data.rfm?.top_customers || [];

    const customerCities = (data.customer_cities || []).map((c: any, i: number) => ({
        ...c,
        color: CITY_COLORS[i % CITY_COLORS.length],
    }));

    const totalCustomers = summary.total_unique_customers || 0;
    const champCount = rfmSegments.find((s: any) => s.segment === "Champions")?.count || 0;
    const champPct = totalCustomers > 0 ? ((champCount / totalCustomers) * 100).toFixed(1) : "0";
    const atRiskCount = rfmSegments.find((s: any) => s.segment === "At Risk")?.count || 0;
    const lostCount = rfmSegments.find((s: any) => s.segment === "Lost")?.count || 0;

    const selectedSegData = activeSeg ? rfmSegments.find((s: any) => s.segment === activeSeg) : null;

    // Segment insights
    const segInsights: Record<string, { desc: string; action: string; icon: any }> = {
        Champions: { desc: "Bought recently, buy often, spend the most", action: "Reward them. Can be early adopters for new products. Will promote your brand.", icon: Crown },
        "Loyal Customers": { desc: "Buy on a regular basis. Responsive to promotions.", action: "Upsell higher value products. Ask for reviews. Engage them.", icon: Heart },
        "Potential Loyalist": { desc: "Recent customers with above-average frequency.", action: "Offer membership / loyalty program. Recommend other products.", icon: Star },
        "At Risk": { desc: "Spent big money, purchased often but long time ago.", action: "Send personalized reactivation campaigns. Offer renewals. Provide helpful resources.", icon: TrendingUp },
        "Need Attention": { desc: "Above average recency, frequency & monetary values. May not have bought very recently.", action: "Make limited time offers. Recommend based on past purchases. Reactivate them.", icon: Target },
        "New Customers": { desc: "Bought most recently, but not frequently.", action: "Provide on-boarding support. Give them early success. Start building a relationship.", icon: UserPlus },
        Lost: { desc: "Lowest recency, frequency and monetary scores.", action: "Revive interest with reach out campaign. Ignore otherwise.", icon: Users },
    };

    return (
        <div className="space-y-6">
            <PageHeader icon={Users} title="Customer Analytics" subtitle="Customer lifetime value, RFM segmentation & retention analysis" />

            {/* ── Sticky Nav ── */}
            <nav className="sticky top-0 z-40 -mx-8 px-8 py-3" style={{ background: "rgba(10,10,25,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    {SECTIONS.map((s) => {
                        const SIcon = s.icon;
                        return (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeSection === s.id
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

            {/* ── KPI Cards ── */}
            <div id="kpis" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard icon={UserPlus} title="Total Customers" value={fmtNum(totalCustomers)} change={`${summary.repeat_rate_pct || 0}% repeat buyers`} trend="up" accentColor="from-accent-purple to-accent-blue" subtitle="All time unique customers" />
                <KpiCard icon={Heart} title="Avg CLV" value={fmt(clvStats.avg_clv || 0)} change={`Max: ${fmt(clvStats.max_clv || 0)}`} trend="up" accentColor="from-accent-teal to-emerald-400" subtitle="Customer lifetime value" />
                <KpiCard icon={Crown} title="Champions" value={`${champPct}%`} change={`${fmtNum(champCount)} customers`} trend="up" accentColor="from-accent-pink to-accent-purple" subtitle="Best RFM segment" />
                <KpiCard icon={Target} title="At Risk + Lost" value={fmtNum(atRiskCount + lostCount)} change={`${totalCustomers > 0 ? (((atRiskCount + lostCount) / totalCustomers) * 100).toFixed(1) : 0}% of base`} trend="down" accentColor="from-amber-500 to-red-500" subtitle="Need reactivation" />
            </div>

            {/* ── RFM Segmentation ── */}
            <div id="segments">
                <ChartCard title="RFM Segmentation" subtitle="Click any segment to see insights & recommended actions" className="animate-slide-up">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Chart */}
                        <div className="xl:col-span-2 h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={rfmSegments} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                    <YAxis dataKey="segment" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} width={130} />
                                    <Tooltip
                                        content={({ active, payload }: any) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="glass-card-static p-3 border border-white/10" style={{ zIndex: 9999 }}>
                                                        <p className="text-xs font-bold text-white mb-1">{d.segment}</p>
                                                        <p className="text-xs text-slate-400">{fmtNum(d.count)} customers</p>
                                                        <p className="text-xs text-slate-400">Avg Spend: {fmt(d.avg_monetary || 0)}</p>
                                                        <p className="text-xs text-slate-400">Avg Frequency: {d.avg_frequency?.toFixed(1)}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22} cursor="pointer" onClick={(data: any) => setActiveSeg(activeSeg === data.segment ? null : data.segment)}>
                                        {rfmSegments.map((entry: any, index: number) => (
                                            <Cell key={index} fill={entry.color} opacity={activeSeg && activeSeg !== entry.segment ? 0.3 : 1} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Segment cards */}
                        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Segments</p>
                            {rfmSegments.map((seg: any) => {
                                const isActive = activeSeg === seg.segment;
                                const pct = totalCustomers > 0 ? ((seg.count / totalCustomers) * 100).toFixed(1) : "0";
                                return (
                                    <button
                                        key={seg.segment}
                                        onClick={() => setActiveSeg(isActive ? null : seg.segment)}
                                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${isActive ? "bg-white/[0.06] ring-1" : "hover:bg-white/[0.03]"
                                            }`}
                                        style={isActive ? { borderColor: seg.color + "40" } : undefined}
                                    >
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-white">{seg.segment}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{fmtNum(seg.count)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: seg.color }} />
                                                </div>
                                                <span className="text-[9px] text-slate-500">{pct}%</span>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-3 h-3 text-slate-600 transition-transform ${isActive ? "rotate-90" : ""}`} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Segment Drill-Down Panel ── */}
                    {selectedSegData && (
                        <div className="mt-6 p-5 rounded-xl animate-slide-up" style={{ background: `${selectedSegData.color}08`, border: `1px solid ${selectedSegData.color}20` }}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${selectedSegData.color}20` }}>
                                        {(() => {
                                            const SegIcon = segInsights[selectedSegData.segment]?.icon || Users;
                                            return <SegIcon className="w-5 h-5" style={{ color: selectedSegData.color }} />;
                                        })()}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{selectedSegData.segment}</h4>
                                        <p className="text-xs text-slate-500">{segInsights[selectedSegData.segment]?.desc || ""}</p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveSeg(null)} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06]">
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <p className="text-lg font-bold text-white">{fmtNum(selectedSegData.count)}</p>
                                    <p className="text-[10px] text-slate-500 uppercase">Customers</p>
                                </div>
                                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <p className="text-lg font-bold text-white">{fmt(selectedSegData.avg_monetary || 0)}</p>
                                    <p className="text-[10px] text-slate-500 uppercase">Avg Spend</p>
                                </div>
                                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <p className="text-lg font-bold text-white">{selectedSegData.avg_frequency?.toFixed(1) || "—"}</p>
                                    <p className="text-[10px] text-slate-500 uppercase">Avg Frequency</p>
                                </div>
                                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <p className="text-lg font-bold text-white">{selectedSegData.avg_recency?.toFixed(0) || "—"} days</p>
                                    <p className="text-[10px] text-slate-500 uppercase">Avg Recency</p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: `${selectedSegData.color}10`, border: `1px solid ${selectedSegData.color}15` }}>
                                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: selectedSegData.color }} />
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Recommended Action</p>
                                    <p className="text-xs text-slate-300">{segInsights[selectedSegData.segment]?.action || ""}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* ── CLV Analysis ── */}
            <div id="clv" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="CLV Tier Distribution" subtitle="Click a tier to see details" className="animate-slide-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Pie */}
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={clvSegments}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="45%"
                                        outerRadius="75%"
                                        dataKey="count"
                                        nameKey="tier"
                                        stroke="rgba(0,0,0,0.3)"
                                        strokeWidth={1}
                                        cursor="pointer"
                                        onClick={(data: any) => setActiveCLV(activeCLV === data.tier ? null : data.tier)}
                                    >
                                        {clvSegments.map((entry: any, i: number) => (
                                            <Cell key={i} fill={entry.color} opacity={activeCLV && activeCLV !== entry.tier ? 0.3 : 1} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name: string) => [fmtNum(value) + " customers", name]}
                                        contentStyle={{ background: "rgba(15,15,35,0.97)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff", fontSize: "13px", fontWeight: 600, padding: "10px 14px", zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                                        wrapperStyle={{ zIndex: 9999 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Tier cards */}
                        <div className="space-y-2">
                            {clvSegments.map((tier: any) => {
                                const pct = totalCLVCustomers > 0 ? ((tier.count / totalCLVCustomers) * 100).toFixed(1) : "0";
                                const isActive = activeCLV === tier.tier;
                                return (
                                    <button
                                        key={tier.tier}
                                        onClick={() => setActiveCLV(isActive ? null : tier.tier)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isActive ? "ring-1 bg-white/[0.04]" : "hover:bg-white/[0.03]"
                                            }`}
                                        style={isActive ? { borderColor: tier.color + "40" } : undefined}
                                    >
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${tier.color}15` }}>
                                            <Award className="w-4 h-4" style={{ color: tier.color }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-white">{tier.tier}</span>
                                                <span className="text-xs font-bold" style={{ color: tier.color }}>{pct}%</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500">{fmtNum(tier.count)} customers</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="CLV Stats" subtitle="Key lifetime value metrics" className="animate-slide-up">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Average CLV", value: fmt(clvStats.avg_clv || 0), color: "#8b5cf6" },
                            { label: "Median CLV", value: fmt(clvStats.median_clv || 0), color: "#3b82f6" },
                            { label: "Max CLV", value: fmt(clvStats.max_clv || 0), color: "#10b981" },
                            { label: "25th Percentile", value: fmt(clvStats.p25 || 0), color: "#f59e0b" },
                            { label: "75th Percentile", value: fmt(clvStats.p75 || 0), color: "#ec4899" },
                            { label: "Repeat Rate", value: `${summary.repeat_rate_pct || 0}%`, color: "#14b8a6" },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="p-4 rounded-xl text-center" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
                                <p className="text-lg font-bold text-white">{value}</p>
                                <p className="text-[10px] text-slate-500 uppercase">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Top customers table */}
                    {topCustomers.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-2">Top Customers</p>
                            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                                <table className="w-full">
                                    <thead>
                                        <tr style={{ background: "rgba(139,92,246,0.06)" }}>
                                            <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">#</th>
                                            <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Customer</th>
                                            <th className="text-right px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Spend</th>
                                            <th className="text-right px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Orders</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topCustomers.slice(0, 5).map((c: any, i: number) => (
                                            <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                                                <td className="px-3 py-2 text-xs text-slate-600 font-mono">{i + 1}</td>
                                                <td className="px-3 py-2 text-xs font-semibold text-white">{c.customer_id}</td>
                                                <td className="px-3 py-2 text-xs text-emerald-400 text-right font-mono">{fmt(c.monetary || c.total_spend || 0)}</td>
                                                <td className="px-3 py-2 text-xs text-slate-400 text-right font-mono">{c.frequency || c.orders || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* ── New vs Returning Trend ── */}
            <div id="trends" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Trend — Area View" subtitle="Stacked area showing growth over time" className="animate-slide-up">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyNR}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ background: "rgba(15,15,35,0.97)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff", fontSize: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                                    wrapperStyle={{ zIndex: 9999 }}
                                />
                                <defs>
                                    <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="returning" name="Returning" stackId="1" stroke="#8b5cf6" fill="url(#retGrad)" strokeWidth={2} />
                                <Area type="monotone" dataKey="new" name="New" stackId="1" stroke="#14b8a6" fill="url(#newGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex gap-6 mt-3 justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-accent-purple" />
                            <span className="text-xs text-slate-400">Returning ({fmtNum(summary.repeat_buyers || 0)})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-accent-teal" />
                            <span className="text-xs text-slate-400">New ({fmtNum(summary.one_time_buyers || 0)})</span>
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="Breakdown — Bar View" subtitle="Monthly new vs returning side-by-side" className="animate-slide-up">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyNR}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <Tooltip contentStyle={{ background: "rgba(15,15,35,0.97)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff", fontSize: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }} wrapperStyle={{ zIndex: 9999 }} />
                                <Bar dataKey="returning" name="Returning" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} barSize={20} />
                                <Bar dataKey="new" name="New" stackId="a" fill="#14b8a6" radius={[6, 6, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex gap-6 mt-3 justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-accent-purple" />
                            <span className="text-xs text-slate-400">Returning</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-accent-teal" />
                            <span className="text-xs text-slate-400">New</span>
                        </div>
                    </div>
                </ChartCard>
            </div>

            {/* ── Customer Geography ── */}
            {customerCities.length > 0 && (
                <div id="cities">
                    <ChartCard title="Customers by City" subtitle="Top cities by customer count and total spend" className="animate-slide-up">
                        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                            <table className="w-full">
                                <thead>
                                    <tr style={{ background: "rgba(139,92,246,0.06)" }}>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">City</th>
                                        <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Customers</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Share</th>
                                        <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Spend</th>
                                        <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Avg Transaction</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerCities.map((city: any, i: number) => {
                                        const share = totalCustomers > 0 ? ((city.customers / totalCustomers) * 100).toFixed(1) : "0";
                                        return (
                                            <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-3 text-xs text-slate-600 font-mono">{i + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3.5 h-3.5" style={{ color: city.color }} />
                                                        <div>
                                                            <span className="text-sm font-semibold text-white">{city.city}</span>
                                                            {city.state && <span className="text-[10px] text-slate-500 ml-1.5">{city.state}</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-white text-right font-mono font-semibold">{fmtNum(city.customers)}</td>
                                                <td className="px-4 py-3 w-32">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                                            <div className="h-full rounded-full" style={{ width: `${share}%`, background: city.color }} />
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 w-10 text-right">{share}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-emerald-400 text-right font-mono">{fmt(city.total_spend || 0)}</td>
                                                <td className="px-4 py-3 text-xs text-slate-400 text-right font-mono">{fmt(city.avg_transaction || 0)}</td>
                                            </tr>
                                        );
                                    })}
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
