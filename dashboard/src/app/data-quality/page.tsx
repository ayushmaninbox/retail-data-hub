"use client";

import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
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

export default function DataQualityPage() {
    const { data, loading } = useApi<any>("/api/data-quality");

    if (loading || !data) return <PageSkeleton />;

    // Handle error from API (if quality report hasn't been generated)
    if (data.error) {
        return (
            <div className="space-y-6">
                <PageHeader icon={ShieldCheck} title="Data Quality" subtitle="Pipeline health, automated quality checks & evidence reports" />
                <div className="glass-card p-8 text-center">
                    <XCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-white mb-2">Quality Report Not Found</p>
                    <p className="text-sm text-slate-400">Run <code className="text-accent-teal bg-white/[0.05] px-2 py-0.5 rounded">python3 src/quality/quality_checks.py</code> to generate the report.</p>
                </div>
            </div>
        );
    }

    const summary = data.summary || {};
    const checkResults = data.check_results || [];
    const datasets = data.datasets_checked || {};

    const overallScore = summary.total_checks > 0
        ? ((summary.passed / summary.total_checks) * 100).toFixed(1)
        : "0";
    const scoreNum = parseFloat(overallScore);

    // Build pipeline health from datasets
    const pipelineHealth = Object.entries(datasets).map(([name, info]: [string, any]) => ({
        layer: name,
        rows: info.rows,
        columns: info.columns,
        status: "Healthy",
    }));

    const layerIcons: Record<string, string> = {
        pos_sales: "🏪",
        web_orders: "🌐",
        warehouse_inventory: "📦",
        shipments: "🚚",
    };

    return (
        <div className="space-y-6">
            <PageHeader icon={ShieldCheck} title="Data Quality" subtitle="Pipeline health, automated quality checks & evidence reports" />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard icon={Activity} title="Quality Score" value={`${overallScore}%`} change={summary.overall_status === "ALL_PASSED" ? "All passed" : "Issues detected"} trend={scoreNum >= 80 ? "up" : "down"} accentColor="from-emerald-500 to-accent-teal" subtitle="Checks pass rate" />
                <KpiCard icon={CheckCircle2} title="Checks Passed" value={`${summary.passed || 0}/${summary.total_checks || 0}`} change={`${summary.failed || 0} failed`} trend={summary.failed === 0 ? "up" : "down"} accentColor="from-accent-purple to-accent-blue" subtitle="Automated DQ rules" />
                <KpiCard icon={Database} title="Total Violations" value={(summary.total_violations || 0).toLocaleString()} change={summary.total_violations === 0 ? "Clean" : "Needs review"} trend={summary.total_violations === 0 ? "up" : "down"} accentColor="from-amber-500 to-accent-orange" subtitle="Across all checks" />
                <KpiCard icon={Layers} title="Datasets Checked" value={`${Object.keys(datasets).length}`} change="Active" trend="neutral" accentColor="from-accent-blue to-accent-teal" subtitle="Source datasets" />
            </div>

            {pipelineHealth.length > 0 && (
                <ChartCard title="Datasets Checked" subtitle="Source data overview" className="animate-slide-up">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {pipelineHealth.map((ds) => (
                            <div key={ds.layer} className="p-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 opacity-5 text-5xl">{layerIcons[ds.layer] || "📊"}</div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-lg">{layerIcons[ds.layer] || "📊"}</span>
                                        <span className="status-pass text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">loaded</span>
                                    </div>
                                    <p className="text-sm font-semibold text-white mb-1">{ds.layer.replace(/_/g, " ")}</p>
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>{(ds.rows || 0).toLocaleString()} rows</span>
                                        <span>{ds.columns || 0} columns</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <ChartCard title="Automated Quality Checks" subtitle={`${checkResults.length} rules validated`} className="xl:col-span-2 animate-slide-up">
                    <div className="space-y-2">
                        {checkResults.map((check: any) => {
                            const isPassed = check.status === "PASS";
                            return (
                                <div key={check.check_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors border border-white/[0.03]">
                                    {isPassed ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-white">{check.check_name}</p>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isPassed ? "status-pass" : "status-fail"}`}>
                                                {check.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-0.5">
                                            <p className="text-xs text-slate-500 font-mono">{check.rule}</p>
                                            {check.violations_found > 0 && (
                                                <p className="text-xs text-amber-400">{check.violations_found} violations</p>
                                            )}
                                            <p className="text-xs text-slate-600">{(check.total_rows_checked || 0).toLocaleString()} rows checked</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ChartCard>

                <div className="space-y-4">
                    <ChartCard title="Overall Quality Score" subtitle="Latest pipeline run" className="animate-slide-up">
                        <div className="flex flex-col items-center py-4">
                            <div className="relative w-36 h-36">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${scoreNum * 2.64} ${264 - scoreNum * 2.64}`} />
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
                                    <span className={`text-[10px] font-medium ${scoreNum >= 90 ? "text-emerald-400" : scoreNum >= 70 ? "text-amber-400" : "text-red-400"}`}>
                                        {scoreNum >= 90 ? "EXCELLENT" : scoreNum >= 70 ? "GOOD" : "NEEDS WORK"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </ChartCard>

                    <ChartCard title="Summary" subtitle="Quality check breakdown" className="animate-slide-up">
                        <div className="space-y-3 py-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Total Checks</span>
                                <span className="text-sm font-bold text-white">{summary.total_checks || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-emerald-400">Passed</span>
                                <span className="text-sm font-bold text-emerald-400">{summary.passed || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-red-400">Failed</span>
                                <span className="text-sm font-bold text-red-400">{summary.failed || 0}</span>
                            </div>
                            <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between">
                                <span className="text-sm text-slate-400">Violations</span>
                                <span className="text-sm font-bold text-amber-400">{(summary.total_violations || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Status</span>
                                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${summary.overall_status === "ALL_PASSED" ? "status-pass" : "text-amber-400 bg-amber-400/10"}`}>
                                    {summary.overall_status?.replace(/_/g, " ") || "N/A"}
                                </span>
                            </div>
                        </div>
                    </ChartCard>
                </div>
            </div>
        </div>
    );
}
