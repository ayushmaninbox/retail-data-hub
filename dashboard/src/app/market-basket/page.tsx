"use client";

import { useState, useEffect, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    ShoppingCart,
    Zap,
    Target,
    TrendingUp,
    ArrowUp,
    ChevronRight,
    Layers,
    Shuffle,
    Package,
    XCircle,
    Sparkles,
    Filter,
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
    ScatterChart,
    Scatter,
    ZAxis,
} from "recharts";

/* ── Config ── */



const TYPE_COLORS: Record<string, string> = {
    "Category": "#14b8a6",
    "Cross-Channel": "#f59e0b",
    "Product": "#8b5cf6",
};

/* ── Helpers ── */

function getLiftColor(lift: number): string {
    if (lift >= 2.0) return "text-emerald-400";
    if (lift >= 1.5) return "text-blue-400";
    if (lift >= 1.0) return "text-amber-400";
    return "text-red-400";
}

function getLiftBg(lift: number): string {
    if (lift >= 2.0) return "bg-emerald-400/10";
    if (lift >= 1.5) return "bg-blue-400/10";
    if (lift >= 1.0) return "bg-amber-400/10";
    return "bg-red-400/10";
}

function getConfidenceBar(confidence: number): string {
    if (confidence >= 0.5) return "from-emerald-500 to-accent-teal";
    if (confidence >= 0.3) return "from-accent-blue to-accent-purple";
    return "from-slate-500 to-slate-400";
}

/* ── Rule Detail Panel ── */

function RuleDetailPanel({
    rule,
    accentColor,
    onClose,
}: {
    rule: any;
    accentColor: string;
    onClose: () => void;
}) {
    if (!rule) return null;

    const strengthLabel =
        rule.confidence >= 0.5 ? "Strong" : rule.confidence >= 0.3 ? "Moderate" : "Weak";
    const strengthColor =
        rule.confidence >= 0.5 ? "#10b981" : rule.confidence >= 0.3 ? "#f59e0b" : "#ef4444";
    const liftLabel =
        rule.lift >= 2.0 ? "High synergy" : rule.lift >= 1.5 ? "Good synergy" : rule.lift >= 1.0 ? "Positive" : "Negative";

    return (
        <div className="mt-4 p-5 rounded-xl animate-slide-up" style={{ background: `${accentColor}06`, border: `1px solid ${accentColor}20` }}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}20` }}>
                        <ShoppingCart className="w-5 h-5" style={{ color: accentColor }} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">Rule Detail</h4>
                        <p className="text-xs text-slate-500">Association rule breakdown</p>
                    </div>
                </div>
                <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-black/[0.06]">
                    <XCircle className="w-4 h-4" />
                </button>
            </div>

            {/* Rule visual */}
            <div className="flex items-center gap-3 mb-5 p-4 rounded-xl flex-wrap" style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <span className="text-sm font-bold text-slate-800 px-3 py-1.5 rounded-lg" style={{ background: `${accentColor}20` }}>
                    {rule.antecedent}
                </span>
                <div className="flex items-center gap-1.5">
                    <div className="w-8 h-[2px] rounded-full" style={{ background: accentColor }} />
                    <ChevronRight className="w-4 h-4" style={{ color: accentColor }} />
                </div>
                <span className="text-sm font-bold text-slate-800 px-3 py-1.5 rounded-lg bg-accent-teal/20">
                    {rule.consequent}
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)" }}>
                    <p className="text-lg font-bold text-slate-800">{(rule.support * 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-slate-500 uppercase">Support</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">Co-occurrence frequency</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)" }}>
                    <p className="text-lg font-bold text-slate-800">{(rule.confidence * 100).toFixed(0)}%</p>
                    <p className="text-[10px] text-slate-500 uppercase">Confidence</p>
                    <p className="text-[9px] mt-0.5" style={{ color: strengthColor }}>{strengthLabel} rule</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)" }}>
                    <p className={`text-lg font-bold ${getLiftColor(rule.lift)}`}>{rule.lift.toFixed(2)}x</p>
                    <p className="text-[10px] text-slate-500 uppercase">Lift</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">{liftLabel}</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)" }}>
                    <p className="text-xs font-bold text-slate-800">{rule.type}</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-1">Rule Type</p>
                </div>
            </div>

            <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}15` }}>
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Business Action</p>
                    <p className="text-xs text-slate-300">
                        {rule.confidence >= 0.5
                            ? `Customers buying ${rule.antecedent} have a ${(rule.confidence * 100).toFixed(0)}% chance of also buying ${rule.consequent}. Create bundle deals or show recommendations at checkout.`
                            : rule.lift >= 1.0
                                ? `There's a ${(rule.confidence * 100).toFixed(0)}% association between ${rule.antecedent} and ${rule.consequent} with ${rule.lift.toFixed(1)}x lift. Consider cross-promotion or co-placement in store layouts.`
                                : `The association between ${rule.antecedent} and ${rule.consequent} is below baseline (lift ${rule.lift.toFixed(2)}x). These items may be substitutes rather than complements.`
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ── Main Page ── */

export default function MarketBasketPage() {
    const { data, loading } = useApi<any>("/api/market-basket");

    const [showScrollTop, setShowScrollTop] = useState(false);
    const [selectedRule, setSelectedRule] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<"confidence" | "lift" | "support">("confidence");

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
            const scrollY = window.scrollY;

        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (loading || !data) return <PageSkeleton />;

    // ── Data extraction ──
    const categoryRulesRaw = (data.category_basket?.rules || []).map((r: any) => ({
        antecedent: Array.isArray(r.if_category) ? r.if_category.join(" + ") : (r.antecedent || ""),
        consequent: Array.isArray(r.then_category) ? r.then_category.join(" + ") : (r.consequent || ""),
        support: r.support,
        confidence: r.confidence,
        lift: r.lift,
        type: "Category",
    }));

    const standardRulesRaw = (data.standard_basket?.rules || []).map((r: any) => ({
        antecedent: r.antecedent,
        consequent: r.consequent,
        support: r.support,
        confidence: r.confidence,
        lift: r.lift,
        type: "Product",
    }));

    const crossRulesRaw = (data.cross_channel?.rules || []).map((r: any) => ({
        antecedent: r.antecedent || (r.if_category || []).join(", "),
        consequent: r.consequent || (r.then_category || []).join(", "),
        support: r.support,
        confidence: r.confidence,
        lift: r.lift,
        type: "Cross-Channel",
    }));

    // Frequent itemsets
    const itemsets = (data.standard_basket?.itemsets || []).map((item: any) => ({
        items: Array.isArray(item.items) ? item.items.join(" + ") : item.items,
        support: item.support,
    })).sort((a: any, b: any) => b.support - a.support);

    const stats = data.standard_basket?.stats || {};
    const crossStats = data.cross_channel?.stats || {};
    const catStats = data.category_basket?.stats || {};

    // ── Combined + sorted + filtered rules ──
    const allRulesRaw = [...categoryRulesRaw, ...standardRulesRaw, ...crossRulesRaw];

    // Apply sort and filter using useMemo-equivalent (computed each render since sortBy/filterType are deps)
    const allRules = [...allRulesRaw].sort((a, b) => b[sortBy] - a[sortBy]);

    const totalRulesCount = allRulesRaw.length;
    const avgConfidence = allRulesRaw.length > 0
        ? (allRulesRaw.reduce((s, r) => s + r.confidence, 0) / allRulesRaw.length * 100).toFixed(1)
        : "0";
    const avgLift = allRulesRaw.length > 0
        ? (allRulesRaw.reduce((s, r) => s + r.lift, 0) / allRulesRaw.length).toFixed(2)
        : "0";
    const maxLift = allRulesRaw.length > 0 ? Math.max(...allRulesRaw.map(r => r.lift)) : 0;
    const strongRules = allRulesRaw.filter(r => r.confidence >= 0.5).length;

    // Top 4 pairs by confidence
    const topPairs = [...allRulesRaw].sort((a, b) => b.confidence - a.confidence).slice(0, 4);

    // Scatter data
    const scatterData = allRulesRaw.map(r => ({
        x: +(r.support * 100).toFixed(1),
        y: +(r.confidence * 100).toFixed(0),
        z: r.lift * 20,
        name: `${r.antecedent} → ${r.consequent}`,
        lift: r.lift,
        type: r.type,
    }));

    // Confidence distribution
    const confBands = [
        { range: "0–20%", count: allRulesRaw.filter(r => r.confidence < 0.2).length, color: "#ef4444" },
        { range: "20–40%", count: allRulesRaw.filter(r => r.confidence >= 0.2 && r.confidence < 0.4).length, color: "#f59e0b" },
        { range: "40–60%", count: allRulesRaw.filter(r => r.confidence >= 0.4 && r.confidence < 0.6).length, color: "#3b82f6" },
        { range: "60–80%", count: allRulesRaw.filter(r => r.confidence >= 0.6 && r.confidence < 0.8).length, color: "#10b981" },
        { range: "80–100%", count: allRulesRaw.filter(r => r.confidence >= 0.8).length, color: "#8b5cf6" },
    ];

    // Lift distribution for horizontal bar
    const liftBands = [
        { range: "< 1.0", count: allRulesRaw.filter(r => r.lift < 1.0).length, color: "#ef4444", label: "Negative" },
        { range: "1.0–1.5", count: allRulesRaw.filter(r => r.lift >= 1.0 && r.lift < 1.5).length, color: "#f59e0b", label: "Moderate" },
        { range: "1.5–2.0", count: allRulesRaw.filter(r => r.lift >= 1.5 && r.lift < 2.0).length, color: "#3b82f6", label: "Strong" },
        { range: "≥ 2.0", count: allRulesRaw.filter(r => r.lift >= 2.0).length, color: "#10b981", label: "Very Strong" },
    ];

    // Type counts
    const typeCounts = [
        { type: "Category", count: categoryRulesRaw.length, color: "#14b8a6", icon: Layers },
        { type: "Product", count: standardRulesRaw.length, color: "#8b5cf6", icon: Package },
        { type: "Cross-Channel", count: crossRulesRaw.length, color: "#f59e0b", icon: Shuffle },
    ];

    return (
        <div className="space-y-6">
            <PageHeader icon={ShoppingCart} title="Market Basket Analysis" subtitle="Apriori association rules — discover what customers buy together" />



            {/* ── KPI Cards ── */}
            <div id="kpis" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard icon={Zap} title="Rules Discovered" value={`${totalRulesCount}`} change={`${itemsets.length} frequent itemsets`} trend="neutral" accentColor="from-accent-purple to-accent-blue" subtitle="Apriori algorithm" />
                <KpiCard icon={Target} title="Avg Confidence" value={`${avgConfidence}%`} change={`${strongRules} strong rules (>50%)`} trend="up" accentColor="from-accent-blue to-accent-teal" subtitle="Higher = stronger" />
                <KpiCard icon={TrendingUp} title="Avg Lift" value={`${avgLift}x`} change={`Max: ${maxLift.toFixed(2)}x`} trend="up" accentColor="from-accent-teal to-emerald-400" subtitle={`${allRulesRaw.filter(r => r.lift > 1).length} positive associations`} />
                <KpiCard icon={ShoppingCart} title="Strong Rules" value={`${strongRules}`} change={`${((strongRules / Math.max(totalRulesCount, 1)) * 100).toFixed(0)}% of total`} trend="up" accentColor="from-accent-pink to-accent-purple" subtitle="Confidence ≥ 50%" />
            </div>

            {/* ── Type breakdown cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
                {typeCounts.map(tc => {
                    const TIcon = tc.icon;
                    return (
                        <div key={tc.type} className="p-4 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.01]" style={{ background: `${tc.color}06`, border: `1px solid ${tc.color}15` }}>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${tc.color}15` }}>
                                <TIcon className="w-5 h-5" style={{ color: tc.color }} />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-slate-800">{tc.count}</p>
                                <p className="text-xs text-slate-500">{tc.type} Rules</p>
                            </div>
                            {tc.count === 0 && (
                                <span className="ml-auto text-[10px] text-slate-600 bg-black/[0.04] px-2 py-0.5 rounded">No data</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Top Recommendation Pairs ── */}
            {topPairs.length > 0 && (
                <div id="top-pairs">
                    <ChartCard title="🎯 Top Recommendation Pairs" subtitle="Highest confidence rules — best candidates for cross-sell and promotions" className="animate-slide-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {topPairs.map((pair, index) => (
                                <div key={index} className="p-4 rounded-xl border border-black/[0.06] bg-gradient-to-br from-black/[0.02] to-transparent hover:border-accent-purple/30 transition-all group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs font-bold text-slate-600 bg-black/[0.06] w-6 h-6 rounded-full flex items-center justify-center">{index + 1}</span>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-sm font-semibold text-slate-800 px-2.5 py-0.5 rounded-full" style={{ background: `${TYPE_COLORS[pair.type] || "#8b5cf6"}20` }}>
                                                {pair.antecedent}
                                            </span>
                                            <span className="text-xs font-bold" style={{ color: TYPE_COLORS[pair.type] || "#8b5cf6" }}>→</span>
                                            <span className="text-sm font-semibold text-slate-800 bg-accent-teal/20 px-2.5 py-0.5 rounded-full">
                                                {pair.consequent}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase">Confidence</p>
                                                <p className="text-sm font-bold text-emerald-400">{(pair.confidence * 100).toFixed(0)}%</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase">Lift</p>
                                                <p className={`text-sm font-bold ${getLiftColor(pair.lift)}`}>{pair.lift.toFixed(2)}x</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase">Support</p>
                                                <p className="text-sm font-bold text-slate-300">{(pair.support * 100).toFixed(1)}%</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ color: TYPE_COLORS[pair.type], background: `${TYPE_COLORS[pair.type]}15` }}>{pair.type}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ChartCard>
                </div>
            )}

            {/* ── All Rules Table (combined) ── */}
            <div id="rules">
                <ChartCard
                    title={`Association Rules (${allRules.length})`}
                    subtitle="Click any rule to see detailed breakdown and business recommendations"
                    className="animate-slide-up"
                    action={
                        <div className="flex items-center gap-1.5 bg-black/[0.04] rounded-lg px-2.5 py-1">
                            <Filter className="w-3 h-3 text-slate-500" />
                            {(["confidence", "lift", "support"] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setSortBy(s); setSelectedRule(null); }}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${sortBy === s
                                        ? "bg-accent-purple/20 text-accent-purple"
                                        : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    }
                >
                    {allRules.length > 0 ? (
                        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                            <table className="w-full">
                                <thead>
                                    <tr style={{ background: "rgba(139,92,246,0.06)" }}>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">If Customer Buys</th>
                                        <th className="text-center px-2 py-3 w-6"></th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">They Also Buy</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Support</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Confidence</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Lift</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allRules.map((rule: any, i: number) => {
                                        const isSelected = selectedRule === i;
                                        const typeColor = TYPE_COLORS[rule.type] || "#8b5cf6";
                                        return (
                                            <tr
                                                key={i}
                                                className={`border-t border-black/[0.04] cursor-pointer transition-all ${isSelected ? "bg-black/[0.04]" : "hover:bg-black/[0.02]"
                                                    }`}
                                                onClick={() => setSelectedRule(isSelected ? null : i)}
                                            >
                                                <td className="px-4 py-3 text-xs text-slate-600 font-mono">{i + 1}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-slate-800 font-semibold px-2.5 py-0.5 rounded-full" style={{ background: `${typeColor}20` }}>
                                                        {rule.antecedent}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-3 text-center">
                                                    <span className="font-bold text-xs" style={{ color: typeColor }}>→</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-semibold text-accent-teal">{rule.consequent}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-1.5 bg-black/5 rounded-full">
                                                            <div className="h-1.5 rounded-full bg-slate-500" style={{ width: `${Math.min(rule.support * 100 * 4, 100)}%` }} />
                                                        </div>
                                                        <span className="text-xs text-slate-400">{(rule.support * 100).toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-black/5 rounded-full">
                                                            <div className={`h-1.5 rounded-full bg-gradient-to-r ${getConfidenceBar(rule.confidence)}`} style={{ width: `${rule.confidence * 100}%` }} />
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-800">{(rule.confidence * 100).toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getLiftColor(rule.lift)} ${getLiftBg(rule.lift)}`}>
                                                        {rule.lift.toFixed(2)}x
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ color: typeColor, background: `${typeColor}15` }}>{rule.type}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No rules match the current filter</p>
                        </div>
                    )}

                    {/* Detail panel for selected rule */}
                    {selectedRule !== null && allRules[selectedRule] && (
                        <RuleDetailPanel
                            rule={allRules[selectedRule]}
                            accentColor={TYPE_COLORS[allRules[selectedRule].type] || "#8b5cf6"}
                            onClose={() => setSelectedRule(null)}
                        />
                    )}
                </ChartCard>
            </div>

            {/* ── Frequent Itemsets ── */}
            {itemsets.length > 0 && (
                <div id="itemsets">
                    <ChartCard title={`Frequent Itemsets (${itemsets.length})`} subtitle="Most commonly purchased items identified by the Apriori algorithm" className="animate-slide-up">
                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                            {itemsets.map((item: any, i: number) => (
                                <div key={i} className="p-3 rounded-xl text-center transition-all hover:scale-[1.02]" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.08)" }}>
                                    <p className="text-xs font-semibold text-slate-800 mb-1 truncate" title={item.items}>{item.items}</p>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                                            <div className="h-full rounded-full bg-accent-purple" style={{ width: `${Math.min(item.support * 100 * 10, 100)}%` }} />
                                        </div>
                                        <span className="text-[10px] text-slate-500">{(item.support * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ChartCard>
                </div>
            )}

            {/* ── Insights Section ── */}
            <div id="insights" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Confidence vs Support Scatter */}
                <ChartCard title="Confidence vs Support" subtitle="Each dot is a rule — size indicates lift strength" className="animate-slide-up">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ bottom: 10, left: 5, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis type="number" dataKey="x" name="Support" unit="%" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} label={{ value: "Support %", position: "bottom", offset: 0, style: { fill: "#64748b", fontSize: 10 } }} />
                                <YAxis type="number" dataKey="y" name="Confidence" unit="%" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                <ZAxis type="number" dataKey="z" range={[40, 300]} />
                                <Tooltip
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="glass-card-dark p-3 ring-1 ring-white/10" style={{ zIndex: 9999 }}>
                                                    <p className="text-xs font-bold text-white mb-1 max-w-[200px]">{d.name}</p>
                                                    <p className="text-xs text-slate-300">Support: {d.x}%</p>
                                                    <p className="text-xs text-slate-300">Confidence: {d.y}%</p>
                                                    <p className="text-xs text-slate-300">Lift: {d.lift.toFixed(2)}x</p>
                                                    <p className="text-[10px] text-accent-purple font-semibold">{d.type}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                    wrapperStyle={{ zIndex: 9999 }}
                                />
                                <Scatter data={scatterData.filter(d => d.type === "Category")} fill="#14b8a6" fillOpacity={0.7} name="Category" />
                                <Scatter data={scatterData.filter(d => d.type === "Product")} fill="#8b5cf6" fillOpacity={0.7} name="Product" />
                                <Scatter data={scatterData.filter(d => d.type === "Cross-Channel")} fill="#f59e0b" fillOpacity={0.7} name="Cross-Channel" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 mt-2 justify-center">
                        {Object.entries(TYPE_COLORS).map(([type, color]) => (
                            <div key={type} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                                <span className="text-[10px] text-slate-500">{type} ({allRulesRaw.filter(r => r.type === type).length})</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                {/* Confidence + Lift Distribution */}
                <ChartCard title="Rule Quality Distribution" subtitle="How rules are distributed by confidence and lift" className="animate-slide-up">
                    <div style={{ position: "relative", zIndex: 10 }}>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-2">By Confidence</p>
                        <div className="h-40" style={{ overflow: "visible" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={confBands} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <YAxis dataKey="range" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} width={55} />
                                    <Tooltip
                                        contentStyle={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px", fontWeight: 600, padding: "10px 14px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                                        wrapperStyle={{ zIndex: 99999, pointerEvents: "none" }}
                                        itemStyle={{ color: "#fff" }}
                                        labelStyle={{ color: "#94a3b8", fontSize: "11px", marginBottom: "4px" }}
                                        formatter={(value: number) => [`${value} rules`, "Count"]}
                                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                    />
                                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                                        {confBands.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="mt-4">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-2">By Lift</p>
                        <div className="space-y-2">
                            {liftBands.map(band => (
                                <div key={band.range} className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-400 w-12 text-right font-mono">{band.range}</span>
                                    <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.04)" }}>
                                        <div
                                            className="h-full rounded-full flex items-center pl-2 transition-all duration-500"
                                            style={{ width: `${totalRulesCount > 0 ? Math.max((band.count / totalRulesCount) * 100, 2) : 0}%`, background: band.color }}
                                        >
                                            {band.count > 0 && <span className="text-[9px] font-bold text-slate-800">{band.count}</span>}
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-slate-600 w-16">{band.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </ChartCard>
            </div>

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
