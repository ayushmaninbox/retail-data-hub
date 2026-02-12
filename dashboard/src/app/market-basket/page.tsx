"use client";

import { ShoppingCart, Zap, Target, TrendingUp } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";

// --- Dummy Data ---
const associationRules = [
    { antecedent: "Wireless Earbuds", consequent: "Phone Case", support: 0.18, confidence: 0.72, lift: 3.4 },
    { antecedent: "USB-C Cable", consequent: "Power Bank", support: 0.15, confidence: 0.68, lift: 3.1 },
    { antecedent: "Keyboard", consequent: "Mouse Pad", support: 0.12, confidence: 0.65, lift: 2.9 },
    { antecedent: "Webcam HD", consequent: "LED Desk Lamp", support: 0.10, confidence: 0.61, lift: 2.7 },
    { antecedent: "Bluetooth Speaker", consequent: "USB-C Cable", support: 0.09, confidence: 0.58, lift: 2.5 },
    { antecedent: "Phone Case", consequent: "Screen Protector", support: 0.22, confidence: 0.78, lift: 3.8 },
    { antecedent: "Power Bank", consequent: "USB-C Cable", support: 0.14, confidence: 0.64, lift: 2.8 },
    { antecedent: "Screen Protector, Phone Case", consequent: "Wireless Earbuds", support: 0.08, confidence: 0.55, lift: 2.3 },
    { antecedent: "LED Desk Lamp", consequent: "Keyboard", support: 0.07, confidence: 0.52, lift: 2.1 },
    { antecedent: "Mouse Pad", consequent: "Webcam HD", support: 0.06, confidence: 0.48, lift: 1.9 },
];

const topPairs = [
    {
        items: ["Phone Case", "Screen Protector"],
        confidence: "78%",
        lift: 3.8,
        insight: "Customers buying phone cases almost always add screen protectors",
    },
    {
        items: ["Wireless Earbuds", "Phone Case"],
        confidence: "72%",
        lift: 3.4,
        insight: "Strong cross-category affinity — bundle opportunity",
    },
    {
        items: ["USB-C Cable", "Power Bank"],
        confidence: "68%",
        lift: 3.1,
        insight: "Charging accessories bought together — shelf placement strategy",
    },
    {
        items: ["Keyboard", "Mouse Pad"],
        confidence: "65%",
        lift: 2.9,
        insight: "Desktop workspace bundle — discount opportunity",
    },
];

function getLiftColor(lift: number): string {
    if (lift >= 3.0) return "text-emerald-400";
    if (lift >= 2.5) return "text-blue-400";
    return "text-slate-400";
}

function getConfidenceBar(confidence: number): string {
    if (confidence >= 0.7) return "from-emerald-500 to-accent-teal";
    if (confidence >= 0.6) return "from-accent-blue to-accent-purple";
    return "from-slate-500 to-slate-400";
}

export default function MarketBasketPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                icon={ShoppingCart}
                title="Market Basket Analysis"
                subtitle="Apriori association rules — discover what customers buy together"
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard
                    icon={Zap}
                    title="Rules Discovered"
                    value="10"
                    change="Apriori"
                    trend="neutral"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="Min support: 5%"
                />
                <KpiCard
                    icon={Target}
                    title="Avg Confidence"
                    value="62.1%"
                    change="+4.3%"
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="Across all rules"
                />
                <KpiCard
                    icon={TrendingUp}
                    title="Avg Lift"
                    value="2.75"
                    change="> 1.0 ✓"
                    trend="up"
                    accentColor="from-accent-teal to-emerald-400"
                    subtitle="All rules positive"
                />
                <KpiCard
                    icon={ShoppingCart}
                    title="Actionable Pairs"
                    value="4"
                    change="Ready"
                    trend="up"
                    accentColor="from-accent-pink to-accent-purple"
                    subtitle="High-confidence bundles"
                />
            </div>

            {/* Top Recommendation Pairs */}
            <ChartCard
                title="🎯 Top Recommendation Pairs"
                subtitle="High-confidence product bundles — ready for cross-sell and promotions"
                className="animate-slide-up"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topPairs.map((pair, index) => (
                        <div
                            key={index}
                            className="p-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent hover:border-accent-purple/30 transition-all group"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">🛒</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {pair.items.map((item, i) => (
                                        <span key={i} className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold text-white bg-accent-purple/20 px-2.5 py-0.5 rounded-full">
                                                {item}
                                            </span>
                                            {i < pair.items.length - 1 && (
                                                <span className="text-accent-purple text-xs font-bold">+</span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">{pair.insight}</p>
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Confidence</p>
                                    <p className="text-sm font-bold text-emerald-400">{pair.confidence}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Lift</p>
                                    <p className="text-sm font-bold text-accent-blue">{pair.lift}x</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ChartCard>

            {/* Association Rules Table */}
            <ChartCard
                title="All Association Rules"
                subtitle="Complete rule set from Apriori analysis — sorted by confidence"
                className="animate-slide-up"
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">#</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Antecedent</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4"></th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Consequent</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Support</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Confidence</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3">Lift</th>
                            </tr>
                        </thead>
                        <tbody>
                            {associationRules.map((rule, index) => (
                                <tr
                                    key={index}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="py-3 pr-4 text-xs text-slate-600">{index + 1}</td>
                                    <td className="py-3 pr-4">
                                        <span className="text-sm text-white font-medium bg-white/[0.04] px-2 py-0.5 rounded">
                                            {rule.antecedent}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4 text-accent-purple font-bold">→</td>
                                    <td className="py-3 pr-4">
                                        <span className="text-sm text-accent-teal font-medium">
                                            {rule.consequent}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 h-1.5 bg-white/5 rounded-full">
                                                <div
                                                    className="h-1.5 rounded-full bg-slate-500"
                                                    style={{ width: `${rule.support * 100 * 4}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {(rule.support * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-white/5 rounded-full">
                                                <div
                                                    className={`h-1.5 rounded-full bg-gradient-to-r ${getConfidenceBar(rule.confidence)}`}
                                                    style={{ width: `${rule.confidence * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-semibold text-white">
                                                {(rule.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3">
                                        <span className={`text-sm font-bold ${getLiftColor(rule.lift)}`}>
                                            {rule.lift.toFixed(1)}x
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
