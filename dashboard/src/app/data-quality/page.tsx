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
    };

    const toggleKpi = (kpi: string) => {
        setExpandedKpi(expandedKpi === kpi ? null : kpi);
    };

    return (
        <div className="space-y-6">
            <PageHeader icon={ShieldCheck} title="Data Quality" subtitle="Pipeline health, automated quality checks & evidence reports" />



            {/* ── KPI Cards with Dropdowns ── */}
            <div id="kpis" className="space-y-4 animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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

                    <KpiCard icon={Layers} title="Datasets Checked" value={`${Object.keys(datasets).length}`} change={`${Object.values(datasets).reduce((s: number, d: any) => s + d.rows, 0).toLocaleString()} total rows`} trend="neutral" accentColor="from-accent-blue to-accent-teal" subtitle="Source datasets" />
                </div>

                {/* ── KPI Drill-Down Panel ── */}
                {expandedKpi && kpiDrilldowns[expandedKpi] && (
                    <div className="glass-card-static p-5 animate-slide-up" style={{ border: expandedKpi === "failed" ? "1px solid rgba(239,68,68,0.15)" : "1px solid rgba(16,185,129,0.15)" }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${expandedKpi === "failed" ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                                    {expandedKpi === "failed" ? <AlertTriangle className="w-4.5 h-4.5 text-red-400" /> : <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">{expandedKpi === "failed" ? "Failed Checks Detail" : "Passed Checks Detail"}</h4>
                                    <p className="text-xs text-slate-500">{expandedKpi === "failed" ? "Checks with violations that need attention" : "Checks that passed all validation rules"}</p>
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
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                    )}
                                    <span className="text-sm text-slate-800 font-medium flex-1">{item.label}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === "pass" ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
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

                            return (
                                <div key={check.check_id}>
                                    <div
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all border border-black/[0.04] ${isExpanded ? "bg-black/[0.02]" : "hover:bg-black/[0.02]"
                                            } ${hasDetails ? "cursor-pointer" : ""}`}
                                        onClick={() => hasDetails && setExpandedCheck(isExpanded ? null : idx)}
                                    >
                                        {isPassed ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-slate-800">{check.check_name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isPassed ? "status-pass" : "status-fail"}`}>
                                                        {check.status}
                                                    </span>
                                                    {hasDetails && (
                                                        isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-0.5">
                                                <p className="text-xs text-slate-500 font-mono">{check.rule}</p>
                                                {check.violations_found > 0 && (
                                                    <p className="text-xs text-amber-400">{check.violations_found.toLocaleString()} violations</p>
                                                )}
                                                <p className="text-xs text-slate-600">{(check.total_rows_checked || 0).toLocaleString()} rows</p>
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
                                                <p className="text-[10px] text-slate-500 uppercase font-semibold">Sample Violations (Top 10)</p>
                                                <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full ml-auto">{check.action_on_failure}</span>
                                            </div>
                                            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                                                <table className="w-full">
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
                                                        {violations.slice(0, 10).map((v: any, vi: number) => (
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
                            <div className="relative w-36 h-36">
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
                                <span className="text-sm text-slate-400">Total Checks</span>
                                <span className="text-sm font-bold text-slate-800">{summary.total_checks || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-emerald-400">Passed</span>
                                <span className="text-sm font-bold text-emerald-400">{summary.passed || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-red-400">Failed</span>
                                <span className="text-sm font-bold text-red-400">{summary.failed || 0}</span>
                            </div>
                            <div className="border-t border-black/[0.06] pt-3 flex items-center justify-between">
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

            {/* ── Violations Chart + Datasets ── */}
            <div id="datasets" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Violations by Check bar chart */}
                {violationsByCheck.length > 0 && (
                    <ChartCard title="Violations by Check" subtitle="Number of violations per failed check" className="animate-slide-up">
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={violationsByCheck} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} width={120} />
                                    <Tooltip
                                        contentStyle={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px", fontWeight: 600, padding: "10px 14px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                                        wrapperStyle={{ zIndex: 99999, pointerEvents: "none" }}
                                        itemStyle={{ color: "#fff" }}
                                        labelStyle={{ color: "#94a3b8", fontSize: "11px", marginBottom: "4px" }}
                                        formatter={(value: number) => [`${value.toLocaleString()} violations`, "Count"]}
                                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                    />
                                    <Bar dataKey="violations" radius={[0, 6, 6, 0]} barSize={18}>
                                        {violationsByCheck.map((entry: { name: string; violations: number; color: string }, i: number) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>
                )}

                {/* Datasets Checked */}
                <ChartCard title="Datasets Checked" subtitle="Source data overview" className="animate-slide-up">
                    <div className="space-y-3">
                        {pipelineHealth.map(ds => (
                            <div key={ds.layer} className="p-4 rounded-xl border border-black/[0.06] bg-gradient-to-br from-black/[0.02] to-transparent relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 opacity-5 text-5xl">{datasetIcons[ds.layer] || "📊"}</div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{datasetIcons[ds.layer] || "📊"}</span>
                                            <p className="text-sm font-semibold text-slate-800 capitalize">{ds.layer.replace(/_/g, " ")}</p>
                                        </div>
                                        <span className="status-pass text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">loaded</span>
                                    </div>
                                    <div className="flex items-center gap-6 text-xs text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Table2 className="w-3 h-3 text-slate-600" />
                                            <span>{(ds.rows || 0).toLocaleString()} rows</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Layers className="w-3 h-3 text-slate-600" />
                                            <span>{ds.columns || 0} columns</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
