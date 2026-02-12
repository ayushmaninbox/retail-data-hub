"use client";

import {
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Database,
    Layers,
    Activity,
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
} from "recharts";

// --- Dummy Data ---
const pipelineHealth = [
    { layer: "Raw", icon: "📥", rows: "15,420", files: 4, status: "Healthy", color: "#64748b" },
    { layer: "Bronze", icon: "🥉", rows: "15,420", files: 4, status: "Healthy", color: "#cd7f32" },
    { layer: "Silver", icon: "🥈", rows: "14,892", files: 1, status: "Healthy", color: "#94a3b8" },
    { layer: "Gold", icon: "🥇", rows: "14,892", files: 5, status: "Healthy", color: "#fbbf24" },
];

const qualityChecks = [
    { id: 1, name: "No Negative Prices", rule: "unit_price >= 0", status: "pass", checked: 14892, failed: 0 },
    { id: 2, name: "No Future Dates", rule: "date <= today()", status: "pass", checked: 14892, failed: 0 },
    { id: 3, name: "No Null Customer IDs", rule: "customer_id IS NOT NULL", status: "pass", checked: 14892, failed: 12 },
    { id: 4, name: "No Duplicates", rule: "Composite key unique", status: "pass", checked: 14892, failed: 0 },
    { id: 5, name: "Referential Integrity", rule: "FK exists in dimension", status: "pass", checked: 14892, failed: 3 },
    { id: 6, name: "Quantity Range", rule: "1 <= qty <= 10,000", status: "warn", checked: 14892, failed: 28 },
    { id: 7, name: "Column Completeness", rule: "% non-null per column", status: "pass", checked: 14892, failed: 0 },
];

const qualityTrend = [
    { run: "Run 1", score: 92 },
    { run: "Run 2", score: 94 },
    { run: "Run 3", score: 95 },
    { run: "Run 4", score: 93 },
    { run: "Run 5", score: 97 },
    { run: "Run 6", score: 98 },
    { run: "Run 7", score: 97.1 },
];

export default function DataQualityPage() {
    const overallScore = 97.1;
    const passCount = qualityChecks.filter((c) => c.status === "pass").length;
    const totalChecks = qualityChecks.length;

    return (
        <div className="space-y-6">
            <PageHeader
                icon={ShieldCheck}
                title="Data Quality"
                subtitle="Pipeline health, automated quality checks & evidence reports"
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard
                    icon={Activity}
                    title="Quality Score"
                    value={`${overallScore}%`}
                    change="+2.1%"
                    trend="up"
                    accentColor="from-emerald-500 to-accent-teal"
                    subtitle="Overall pipeline quality"
                />
                <KpiCard
                    icon={CheckCircle2}
                    title="Checks Passed"
                    value={`${passCount}/${totalChecks}`}
                    change="All clear"
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="Automated DQ rules"
                />
                <KpiCard
                    icon={Database}
                    title="Total Rows (Gold)"
                    value="14,892"
                    change="Validated"
                    trend="neutral"
                    accentColor="from-amber-500 to-accent-orange"
                    subtitle="Fact + dimension tables"
                />
                <KpiCard
                    icon={Layers}
                    title="Pipeline Layers"
                    value="4"
                    change="Active"
                    trend="neutral"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="Raw → Bronze → Silver → Gold"
                />
            </div>

            {/* Pipeline Health */}
            <ChartCard
                title="Pipeline Health"
                subtitle="Medallion architecture layer status"
                className="animate-slide-up"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {pipelineHealth.map((layer) => (
                        <div
                            key={layer.layer}
                            className="p-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-16 h-16 opacity-5 text-5xl">
                                {layer.icon}
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-lg">{layer.icon}</span>
                                    <span className="status-pass text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                                        {layer.status}
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-white mb-1">{layer.layer} Layer</p>
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>{layer.rows} rows</span>
                                    <span>{layer.files} files</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ChartCard>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Quality Checks */}
                <ChartCard
                    title="Automated Quality Checks"
                    subtitle="7 rules validated at every pipeline run"
                    className="xl:col-span-2 animate-slide-up"
                >
                    <div className="space-y-2">
                        {qualityChecks.map((check) => (
                            <div
                                key={check.id}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors border border-white/[0.03]"
                            >
                                {check.status === "pass" ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                ) : check.status === "warn" ? (
                                    <XCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-white">{check.name}</p>
                                        <span
                                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${check.status === "pass"
                                                    ? "status-pass"
                                                    : check.status === "warn"
                                                        ? "status-warn"
                                                        : "status-fail"
                                                }`}
                                        >
                                            {check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-0.5">
                                        <p className="text-xs text-slate-500 font-mono">{check.rule}</p>
                                        {check.failed > 0 && (
                                            <p className="text-xs text-amber-400">
                                                {check.failed} issues found
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                {/* Quality Score Trend + Gauge */}
                <div className="space-y-4">
                    {/* Gauge */}
                    <ChartCard
                        title="Overall Quality Score"
                        subtitle="Latest pipeline run"
                        className="animate-slide-up"
                    >
                        <div className="flex flex-col items-center py-4">
                            <div className="relative w-36 h-36">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="42"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.05)"
                                        strokeWidth="8"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="42"
                                        fill="none"
                                        stroke="url(#scoreGrad)"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${overallScore * 2.64} ${264 - overallScore * 2.64}`}
                                    />
                                    <defs>
                                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#8b5cf6" />
                                            <stop offset="50%" stopColor="#3b82f6" />
                                            <stop offset="100%" stopColor="#14b8a6" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-white">{overallScore}%</span>
                                    <span className="text-[10px] text-emerald-400 font-medium">EXCELLENT</span>
                                </div>
                            </div>
                        </div>
                    </ChartCard>

                    {/* Quality Trend */}
                    <ChartCard
                        title="Quality Trend"
                        subtitle="Score across pipeline runs"
                        className="animate-slide-up"
                    >
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={qualityTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="run"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 10 }}
                                    />
                                    <YAxis
                                        domain={[85, 100]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 10 }}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [`${value}%`, "Score"]}
                                        contentStyle={{
                                            background: "rgba(15,15,35,0.95)",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "12px",
                                            color: "#fff",
                                            fontSize: "12px",
                                        }}
                                    />
                                    <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="url(#trendGrad)" barSize={20} />
                                    <defs>
                                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#14b8a6" />
                                            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>
                </div>
            </div>
        </div>
    );
}
