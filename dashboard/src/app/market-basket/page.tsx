"use client";

import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import { ShoppingCart, Zap, Target, TrendingUp } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";

function getLiftColor(lift: number): string {
    if (lift >= 2.0) return "text-emerald-400";
    if (lift >= 1.5) return "text-blue-400";
    return "text-slate-400";
}

function getConfidenceBar(confidence: number): string {
    if (confidence >= 0.5) return "from-emerald-500 to-accent-teal";
    if (confidence >= 0.3) return "from-accent-blue to-accent-purple";
    return "from-slate-500 to-slate-400";
}

export default function MarketBasketPage() {
    const { data, loading } = useApi<any>("/api/market-basket");

    if (loading || !data) return <PageSkeleton />;

    // Standard and cross-channel rules use antecedent/consequent
    const standardRules = (data.standard_basket?.rules || []).map((r: any) => ({
        antecedent: r.antecedent,
        consequent: r.consequent,
        support: r.support,
        confidence: r.confidence,
        lift: r.lift,
        type: "Product",
    }));
    const crossRules = (data.cross_channel?.rules || []).map((r: any) => ({
        antecedent: r.antecedent || r.if_category?.join(", ") || "",
        consequent: r.consequent || r.then_category?.join(", ") || "",
        support: r.support,
        confidence: r.confidence,
        lift: r.lift,
        type: "Cross-Channel",
    }));
    // Category rules use if_category/then_category (arrays)
    const categoryRules = (data.category_basket?.rules || []).map((r: any) => ({
        antecedent: Array.isArray(r.if_category) ? r.if_category.join(" + ") : (r.antecedent || ""),
        consequent: Array.isArray(r.then_category) ? r.then_category.join(" + ") : (r.consequent || ""),
        support: r.support,
        confidence: r.confidence,
        lift: r.lift,
        type: "Category",
    }));

    const allRules = [...standardRules, ...crossRules, ...categoryRules]
        .sort((a, b) => b.confidence - a.confidence);

    const stats = data.standard_basket?.stats || {};
    const crossStats = data.cross_channel?.stats || {};
    const catStats = data.category_basket?.stats || {};
    const totalRules = (stats.association_rules_found || 0) + (crossStats.cross_channel_rules || 0) + (catStats.rules_found || 0);

    // Top pairs: highest confidence rules
    const topPairs = allRules.slice(0, 4);

    const avgConfidence = allRules.length > 0
        ? (allRules.reduce((s, r) => s + r.confidence, 0) / allRules.length * 100).toFixed(1)
        : "0";
    const avgLift = allRules.length > 0
        ? (allRules.reduce((s, r) => s + r.lift, 0) / allRules.length).toFixed(2)
        : "0";

    return (
        <div className="space-y-6">
            <PageHeader icon={ShoppingCart} title="Market Basket Analysis" subtitle="Apriori association rules — discover what customers buy together" />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard icon={Zap} title="Rules Discovered" value={`${totalRules}`} change="Apriori" trend="neutral" accentColor="from-accent-purple to-accent-blue" subtitle={`${stats.frequent_itemsets_found || 0} frequent itemsets`} />
                <KpiCard icon={Target} title="Avg Confidence" value={`${avgConfidence}%`} change="Across all rules" trend="up" accentColor="from-accent-blue to-accent-teal" subtitle="Higher = stronger" />
                <KpiCard icon={TrendingUp} title="Avg Lift" value={`${avgLift}`} change="> 1.0 ✓" trend="up" accentColor="from-accent-teal to-emerald-400" subtitle="All rules positive" />
                <KpiCard icon={ShoppingCart} title="Category Rules" value={`${catStats.rules_found || 0}`} change="USP Feature" trend="up" accentColor="from-accent-pink to-accent-purple" subtitle="Cross-category insights" />
            </div>

            {topPairs.length > 0 && (
                <ChartCard title="🎯 Top Recommendation Pairs" subtitle="High-confidence association rules — ready for cross-sell and promotions" className="animate-slide-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {topPairs.map((pair, index) => (
                            <div key={index} className="p-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent hover:border-accent-purple/30 transition-all group">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🛒</span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-sm font-semibold text-white bg-accent-purple/20 px-2.5 py-0.5 rounded-full">
                                            {pair.antecedent}
                                        </span>
                                        <span className="text-accent-purple text-xs font-bold">→</span>
                                        <span className="text-sm font-semibold text-white bg-accent-teal/20 px-2.5 py-0.5 rounded-full">
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
                                            <p className="text-sm font-bold text-accent-blue">{pair.lift.toFixed(2)}x</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase">Support</p>
                                            <p className="text-sm font-bold text-slate-300">{(pair.support * 100).toFixed(1)}%</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-600 bg-white/[0.04] px-2 py-0.5 rounded">{pair.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            )}

            <ChartCard title="All Association Rules" subtitle={`Complete rule set — ${allRules.length} rules sorted by confidence`} className="animate-slide-up">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">#</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">If Customer Buys</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4"></th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">They Also Buy</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Support</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Confidence</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Lift</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3">Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allRules.slice(0, 20).map((rule, index) => (
                                <tr key={index} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="py-3 pr-4 text-xs text-slate-600">{index + 1}</td>
                                    <td className="py-3 pr-4">
                                        <span className="text-sm text-white font-medium bg-white/[0.04] px-2 py-0.5 rounded">
                                            {rule.antecedent}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4 text-accent-purple font-bold">→</td>
                                    <td className="py-3 pr-4">
                                        <span className="text-sm text-accent-teal font-medium">{rule.consequent}</span>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 h-1.5 bg-white/5 rounded-full">
                                                <div className="h-1.5 rounded-full bg-slate-500" style={{ width: `${Math.min(rule.support * 100 * 4, 100)}%` }} />
                                            </div>
                                            <span className="text-xs text-slate-400">{(rule.support * 100).toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-white/5 rounded-full">
                                                <div className={`h-1.5 rounded-full bg-gradient-to-r ${getConfidenceBar(rule.confidence)}`} style={{ width: `${rule.confidence * 100}%` }} />
                                            </div>
                                            <span className="text-xs font-semibold text-white">{(rule.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <span className={`text-sm font-bold ${getLiftColor(rule.lift)}`}>{rule.lift.toFixed(2)}x</span>
                                    </td>
                                    <td className="py-3">
                                        <span className="text-[10px] text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-md">{rule.type}</span>
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
