"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Database,
    Layers,
    Activity,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    ArrowUp,
    Eye,
    FileWarning,
    Table2,
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
} from "recharts";

/* ── Config ── */



const datasetIcons: Record<string, string> = {
    pos_sales: "🏪",
    web_orders: "🌐",
    warehouse_inventory: "📦",
    shipments: "🚚",
};

/* ── Main Page ── */

export default function DataQualityPage() {
    const { data, loading } = useApi<any>("/api/data-quality");

    const [showScrollTop, setShowScrollTop] = useState(false);
    const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
    const [expandedCheck, setExpandedCheck] = useState<number | null>(null);
    const [violationPage, setViolationPage] = useState(1);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
            const scrollY = window.scrollY;

        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (loading || !data) return <PageSkeleton />;

    // Handle error
    if (data.error) {
        return (
            <div className="space-y-6">
                <PageHeader icon={ShieldCheck} title="Data Quality" subtitle="Pipeline health, automated quality checks & evidence reports" />
                <div className="glass-card p-8 text-center">
                    <XCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-slate-800 mb-2">Quality Report Not Found</p>
                    <p className="text-sm text-slate-400">Run <code className="text-accent-teal bg-black/[0.04] px-2 py-0.5 rounded">python3 src/quality/quality_checks.py</code> to generate the report.</p>
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

    const passedChecks = checkResults.filter((c: any) => c.status === "PASS");
    const failedChecks = checkResults.filter((c: any) => c.status === "FAIL");


    // Violations by check (bar chart data)
    const violationsByCheck = checkResults
        .filter((c: any) => c.violations_found > 0)
        .map((c: any) => ({
            name: c.check_name,
            violations: c.violations_found,
            color: c.violations_found > 500 ? "#ef4444" : c.violations_found > 100 ? "#f59e0b" : "#3b82f6",
        }));

    // Pass/Fail pie
    const passFailPie = [
        { name: "Passed", value: summary.passed || 0, color: "#10b981" },
        { name: "Failed", value: summary.failed || 0, color: "#ef4444" },
    ];

    // Pipeline health
    const pipelineHealth = Object.entries(datasets).map(([name, info]: [string, any]) => ({
        layer: name,
        rows: info.rows,
        columns: info.columns,
    }));

    // KPI drill-down data
    const kpiDrilldowns: Record<string, { items: { label: string; value: string | number; status: "pass" | "fail" | "neutral" }[] }> = {
        "passed": {
            items: passedChecks.map((c: any) => ({
                label: c.check_name,
                value: `${(c.total_rows_checked || 0).toLocaleString()} rows`,
                status: "pass" as const,
            })),
        },
        "failed": {
            items: failedChecks.map((c: any) => ({
                label: c.check_name,
                value: `${c.violations_found.toLocaleString()} violations`,
                status: "fail" as const,
            })),
        },
        "datasets": {
            items: pipelineHealth.map((ds: any) => ({
                label: `${datasetIcons[ds.layer] || "📊"} ${ds.layer.replace(/_/g, " ")}`,
                value: `${ds.rows.toLocaleString()} rows`,
                status: "neutral" as const,
            })),
        },
    };

    const toggleKpi = (kpi: string) => {
        setExpandedKpi(expandedKpi === kpi ? null : kpi);
    };

    return (
        <div className="space-y-6">
            <PageHeader icon={ShieldCheck} title="Data Quality" subtitle="Pipeline health, automated quality checks & evidence reports" />



            {/* ── KPI Cards with Dropdowns ── */}
            <div id="kpis" className="space-y-4 animate-slide-up">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <KpiCard icon={Activity} title="Quality Score" value={`${overallScore}%`} change={summary.overall_status === "ALL_PASSED" ? "All passed" : "Issues detected"} trend={scoreNum >= 80 ? "up" : "down"} accentColor="from-emerald-500 to-accent-teal" subtitle="Checks pass rate" />

                    {/* Checks Passed — clickable */}
                    <KpiCard
                        icon={CheckCircle2}
                        title="Checks Passed"
                        value={`${summary.passed || 0}/${summary.total_checks || 0}`}
                        trend="up"
                        accentColor="from-accent-purple to-accent-blue"
                        subtitle="Automated DQ rules"
                        onClick={() => toggleKpi("passed")}
                    />

                    {/* Failed — clickable */}
                    <KpiCard
                        icon={XCircle}
                        title="Total Violations"
                        value={(summary.total_violations || 0).toLocaleString()}
                        trend={summary.total_violations === 0 ? "up" : "down"}
                        accentColor="from-amber-500 to-accent-orange"
                        subtitle={`Across all checks — ${summary.failed || 0} failed`}
                        onClick={() => toggleKpi("failed")}
                    />

                    {/* Datasets Checked — clickable */}
                    <KpiCard
                        icon={Layers}
                        title="Datasets Checked"
                        value={`${Object.keys(datasets).length}`}
                        trend="neutral"
                        accentColor="from-accent-blue to-accent-teal"
                        subtitle="Source datasets"
                        onClick={() => toggleKpi("datasets")}
                    />
                </div>

                {/* ── KPI Drill-Down Panel ── */}
                {expandedKpi && kpiDrilldowns[expandedKpi as keyof typeof kpiDrilldowns] && (
                    <div
                        className="glass-card-static p-5 animate-slide-up"
                        style={{
                            border: expandedKpi === "failed"
                                ? "1px solid rgba(239,68,68,0.15)"
                                : expandedKpi === "passed"
                                    ? "1px solid rgba(16,185,129,0.15)"
                                    : "1px solid rgba(0,0,0,0.08)"
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${expandedKpi === "failed" ? "bg-red-500/10" : expandedKpi === "passed" ? "bg-emerald-500/10" : "bg-slate-500/10"}`}>
                                    {expandedKpi === "failed" ? <AlertTriangle className="w-4.5 h-4.5 text-red-400" /> : expandedKpi === "passed" ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" /> : <Layers className="w-4.5 h-4.5 text-slate-500" />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">
                                        {expandedKpi === "failed" ? "Failed Checks Detail" : expandedKpi === "passed" ? "Passed Checks Detail" : "Source Datasets Details"}
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        {expandedKpi === "failed" ? "Checks with violations that need attention" : expandedKpi === "passed" ? "Checks that passed all validation rules" : "Overview of datasets processed in this run"}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setExpandedKpi(null)} className="text-slate-500 hover:text-slate-800 transition-colors">
                                <ChevronUp className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {kpiDrilldowns[expandedKpi].items.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/[0.02] transition-colors" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
                                    {item.status === "pass" ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    ) : item.status === "neutral" ? (
                                        <Database className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                    )}
                                    <span className="text-sm text-slate-800 font-medium flex-1">{item.label}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === "pass" ? "text-emerald-400 bg-emerald-400/10" :
                                        item.status === "neutral" ? "text-slate-500 bg-slate-500/10" :
                                            "text-red-400 bg-red-400/10"
                                        }`}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Quality Checks with expandable detail ── */}
            <div id="checks" className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <ChartCard title="Automated Quality Checks" subtitle={`${checkResults.length} rules validated`} className="xl:col-span-2 animate-slide-up">
                    <div className="space-y-2">
                        {checkResults.map((check: any, idx: number) => {
                            const isPassed = check.status === "PASS";
                            const isExpanded = expandedCheck === idx;
                            const violations = check.violation_details || [];
                            const hasDetails = violations.length > 0 || check.all_columns;
                            const canExpand = hasDetails && !(check.check_id === 7 && isPassed);

                            return (
                                <div key={check.check_id}>
                                    <div
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all border border-black/[0.04] ${isExpanded ? "bg-black/[0.02]" : "hover:bg-black/[0.02]"
                                            } ${canExpand ? "cursor-pointer" : ""}`}
                                        onClick={() => {
                                            if (!canExpand) return;
                                            const newExpanded = isExpanded ? null : idx;
                                            setExpandedCheck(newExpanded);
                                            setViolationPage(1); // Reset page on toggle
                                        }}
                                    >
                                        {isPassed ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-slate-800">{check.check_name}</p>
                                                <div className="flex items-center gap-2 min-w-[80px] justify-end">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isPassed ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}`}>
                                                        {check.status}
                                                    </span>
                                                    <div className="w-4 flex items-center justify-center">
                                                        {canExpand && (
                                                            isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-0.5">
                                                <p className="text-xs text-slate-500 font-medium font-mono">{check.rule}</p>
                                                {check.violations_found > 0 && (
                                                    <p className="text-xs text-amber-500 font-semibold">{check.violations_found.toLocaleString()} violations</p>
                                                )}
                                                <p className="text-xs text-slate-600 font-medium">{(check.total_rows_checked || 0).toLocaleString()} rows</p>
                                            </div>
                                            <div className="flex gap-1.5 mt-1">
                                                {(check.datasets || []).map((ds: string) => (
                                                    <span key={ds} className="text-[9px] text-slate-600 bg-black/[0.03] px-1.5 py-0.5 rounded">{datasetIcons[ds] || "📊"} {ds.replace(/_/g, " ")}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded detail panel */}
                                    {isExpanded && violations.length > 0 && (
                                        <div className="ml-8 mt-2 mb-3 p-4 rounded-xl animate-slide-up" style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.1)" }}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Eye className="w-3.5 h-3.5 text-red-400" />
                                                <p className="text-[10px] text-slate-500 uppercase font-semibold">
                                                    Violations {((violationPage - 1) * 10) + 1} - {Math.min(violationPage * 10, violations.length)} of {violations.length}
                                                </p>
                                                <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full ml-auto">{check.action_on_failure}</span>
                                            </div>
                                            <div className="rounded-lg overflow-x-auto border border-black/[0.06]">
                                                <table className="w-full min-w-[500px]">
                                                    <thead>
                                                        <tr style={{ background: "rgba(239,68,68,0.05)" }}>
                                                            <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Source</th>
                                                            <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Row ID</th>
                                                            {violations[0]?.unit_price !== undefined && (
                                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Value</th>
                                                            )}
                                                            {violations[0]?.duplicate_rows !== undefined && (
                                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Duplicates</th>
                                                            )}
                                                            <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {violations.slice((violationPage - 1) * 10, violationPage * 10).map((v: any, vi: number) => (
                                                            <tr key={vi} className="border-t border-black/[0.04]">
                                                                <td className="px-3 py-2 text-xs text-slate-400">{datasetIcons[v.source] || ""} {v.source}</td>
                                                                <td className="px-3 py-2 text-xs text-slate-800 font-mono">{v.row_id || `row ${v.row_index}`}</td>
                                                                {v.unit_price !== undefined && (
                                                                    <td className="px-3 py-2 text-xs text-red-400 font-bold">₹{v.unit_price.toLocaleString()}</td>
                                                                )}
                                                                {v.duplicate_rows !== undefined && (
                                                                    <td className="px-3 py-2 text-xs text-amber-400 font-bold">{v.duplicate_rows.toLocaleString()}</td>
                                                                )}
                                                                <td className="px-3 py-2">
                                                                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">{v.action}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Pagination Controls */}
                                            {violations.length > 10 && (
                                                <div className="flex items-center justify-between mt-3 px-1">
                                                    <p className="text-[10px] text-slate-500 font-medium">
                                                        Page {violationPage} of {Math.ceil(violations.length / 10)}
                                                    </p>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setViolationPage(p => Math.max(1, p - 1)); }}
                                                            disabled={violationPage === 1}
                                                            className="px-2 py-1 rounded-md text-[10px] font-bold bg-black/[0.04] text-slate-600 disabled:opacity-30 hover:bg-black/[0.08] transition-colors"
                                                        >
                                                            Prev
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setViolationPage(p => Math.min(Math.ceil(violations.length / 10), p + 1)); }}
                                                            disabled={violationPage >= Math.ceil(violations.length / 10)}
                                                            className="px-2 py-1 rounded-md text-[10px] font-bold bg-black/[0.04] text-slate-600 disabled:opacity-30 hover:bg-black/[0.08] transition-colors"
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ChartCard>

                <div className="space-y-4">
                    {/* Quality Score Ring */}
                    <ChartCard title="Overall Quality Score" subtitle="Latest pipeline run" className="animate-slide-up">
                        <div className="flex flex-col items-center py-4">
                            <div className="relative w-32 h-32 lg:w-36 lg:h-36">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
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
                                    <span className="text-3xl font-bold text-slate-800">{overallScore}%</span>
                                    <span className={`text-[10px] font-medium ${scoreNum >= 90 ? "text-emerald-400" : scoreNum >= 70 ? "text-amber-400" : "text-red-400"}`}>
                                        {scoreNum >= 90 ? "EXCELLENT" : scoreNum >= 70 ? "GOOD" : "NEEDS WORK"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Pass/Fail mini bar */}
                        <div className="mt-2">
                            <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden mb-2" style={{ background: "rgba(0,0,0,0.04)" }}>
                                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${scoreNum}%` }} />
                                <div className="h-full rounded-full bg-red-500 transition-all duration-700" style={{ width: `${100 - scoreNum}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-emerald-400">{summary.passed} passed</span>
                                <span className="text-red-400">{summary.failed} failed</span>
                            </div>
                        </div>
                    </ChartCard>

                    {/* Summary */}
                    <ChartCard title="Summary" subtitle="Quality check breakdown" className="animate-slide-up">
                        <div className="space-y-3 py-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500 font-medium">Total Checks</span>
                                <span className="text-sm font-bold text-slate-800">{summary.total_checks || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500 font-medium">Test Results</span>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-sm font-bold text-emerald-500">{summary.passed || 0} passed</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        <span className="text-sm font-bold text-red-500">{summary.failed || 0} failed</span>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-black/[0.06] pt-3 flex items-center justify-between">
                                <span className="text-sm text-slate-500 font-medium">Violations</span>
                                <span className="text-sm font-bold text-amber-500">{(summary.total_violations || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500 font-medium">Status</span>
                                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${summary.overall_status === "ALL_PASSED" ? "status-pass" : "text-amber-500 bg-amber-400/10"}`}>
                                    {summary.overall_status?.replace(/_/g, " ") || "N/A"}
                                </span>
                            </div>
                        </div>
                    </ChartCard>
                </div>
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
