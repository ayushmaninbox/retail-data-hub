"use client";

import { useState, useEffect, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
    TrendingUp, Brain, Target, ArrowUpRight, ArrowDownRight, Minus,
    ArrowUp, Cpu, Layers, Database, Clock, Activity, BarChart3, Settings2,
    ChevronDown, ChevronUp, X,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";

const fmt = (n: number) =>
    n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` :
        n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` :
            `₹${n.toLocaleString("en-IN")}`;

const COLORS = [
    "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981",
    "#ef4444", "#ec4899", "#3b82f6", "#84cc16",
];

const SECTIONS = [
    { id: "kpis", label: "Overview", icon: Activity },
    { id: "forecast", label: "Forecast", icon: TrendingUp },
    { id: "model", label: "Model", icon: Brain },
    { id: "training", label: "Training", icon: BarChart3 },
];

export default function ForecastPage() {
    const { data: rawData, loading, error } = useApi("/api/forecast");
    const [activeSection, setActiveSection] = useState("kpis");
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const drillDownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedCategory && drillDownRef.current) {
            setTimeout(() => {
                drillDownRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
        }
    }, [selectedCategory]);

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

    if (loading) return <PageSkeleton />;
    if (error || !rawData || (rawData as any).error) {
        return (
            <div className="space-y-6">
                <PageHeader icon={Brain} title="LSTM Demand Forecast" subtitle="Deep learning powered demand prediction" />
                <div className="glass-card p-8 text-center">
                    <Brain className="w-12 h-12 text-accent-purple mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Forecast Not Available</h2>
                    <p className="text-slate-400">
                        Run <code className="text-accent-teal bg-black/5 px-2 py-1 rounded">
                            ./scripts/forecast.sh</code> to train the LSTM model first.
                    </p>
                </div>
            </div>
        );
    }

    const data = rawData as any;
    const summary = data.summary || {};
    const metrics = data.model_metrics || {};
    const catSummary = data.category_summary || [];
    const forecasts = data.forecast || [];
    const config = data.model_config || {};
    const history = data.training_history || [];

    // Prepare aggregated forecast chart data
    const forecastByDate: Record<string, any> = {};
    forecasts.forEach((f: any) => {
        if (!forecastByDate[f.date]) {
            forecastByDate[f.date] = { date: f.date, total: 0, lower: 0, upper: 0 };
        }
        forecastByDate[f.date].total += f.predicted_revenue;
        forecastByDate[f.date].lower += f.lower;
        forecastByDate[f.date].upper += f.upper;
    });
    const dailyForecast = Object.values(forecastByDate).map((d: any) => ({
        ...d,
        date: d.date.slice(5),
        total: Math.round(d.total),
        lower: Math.round(d.lower),
        upper: Math.round(d.upper),
    }));

    // Per-category forecast data for drill-down
    const getCategoryForecast = (category: string) => {
        return forecasts
            .filter((f: any) => f.category === category)
            .map((f: any) => ({
                date: f.date.slice(5),
                predicted: Math.round(f.predicted_revenue),
                lower: Math.round(f.lower),
                upper: Math.round(f.upper),
            }));
    };

    // Category color map
    const catColorMap: Record<string, string> = {};
    catSummary.forEach((cat: any, i: number) => {
        catColorMap[cat.category] = COLORS[i % COLORS.length];
    });

    // Trend icon
    const TrendIcon = ({ trend }: { trend: string }) =>
        trend === "rising" ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> :
            trend === "falling" ? <ArrowDownRight className="w-4 h-4 text-red-400" /> :
                <Minus className="w-4 h-4 text-slate-400" />;

    // Model config items
    const configItems = [
        { label: "Architecture", value: config.architecture || "LSTM", icon: Cpu, color: "#8b5cf6" },
        { label: "Layers", value: config.layers || 2, icon: Layers, color: "#06b6d4" },
        { label: "Hidden Dim", value: config.hidden_dim || 64, icon: Database, color: "#f59e0b" },
        { label: "Sequence Length", value: `${config.sequence_length || 30} days`, icon: Clock, color: "#10b981" },
        { label: "Epochs", value: config.epochs || 60, icon: Activity, color: "#ec4899" },
        { label: "Forecast Horizon", value: `${config.forecast_horizon_days || 30} days`, icon: Target, color: "#3b82f6" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader icon={Brain} title="LSTM Demand Forecast" subtitle="Deep learning powered demand prediction across 8 product categories" />

            {/* ── Sticky Nav ── */}
            <nav className="sticky top-0 z-40 -mx-8 px-8 py-3" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    {SECTIONS.map(s => {
                        const SIcon = s.icon;
                        return (
                            <a key={s.id} href={`#${s.id}`}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeSection === s.id
                                    ? "bg-accent-purple/20 text-accent-purple shadow-sm shadow-accent-purple/10"
                                    : "text-slate-400 hover:text-slate-800 hover:bg-black/[0.04]"
                                    }`}>
                                <SIcon className="w-3.5 h-3.5" />
                                {s.label}
                            </a>
                        );
                    })}
                </div>
            </nav>

            {/* ── KPI Cards ── */}
            <div id="kpis" className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard icon={TrendingUp} title="30-Day Predicted Revenue" value={fmt(summary.total_30d_predicted_revenue || 0)} change={`Across ${summary.categories_trained || 0} categories`} trend="up" accentColor="from-accent-purple to-accent-blue" subtitle="LSTM forecast" />
                <KpiCard icon={ArrowUpRight} title="Top Growth Category" value={summary.top_growth_category || "N/A"} change={`+${summary.top_growth_pct || 0}% predicted increase`} trend="up" accentColor="from-emerald-500 to-accent-teal" subtitle="Highest predicted growth" />
                <KpiCard icon={Target} title="Model Accuracy (R²)" value={`${((metrics.avg_r2 || 0) * 100).toFixed(1)}%`} change="Avg across all categories" trend={metrics.avg_r2 > 0 ? "up" : "down"} accentColor="from-accent-purple to-accent-blue" subtitle="Coefficient of determination" />
                <KpiCard icon={Activity} title="Mean Abs Error" value={fmt(metrics.avg_mae || 0)} change="Average prediction deviation" trend="neutral" accentColor="from-amber-500 to-accent-orange" subtitle="Model precision" />
            </div>

            {/* ── Model Config Card ── */}
            <ChartCard title="Model Architecture" subtitle="LSTM neural network configuration" className="animate-slide-up">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    {configItems.map(item => {
                        const Icon = item.icon;
                        return (
                            <div key={item.label} className="p-3 rounded-xl border border-black/[0.06] bg-gradient-to-br from-black/[0.02] to-transparent text-center">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: `${item.color}15` }}>
                                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                                </div>
                                <p className="text-lg font-bold text-slate-800">{item.value}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{item.label}</p>
                            </div>
                        );
                    })}
                </div>
            </ChartCard>

            {/* ── Forecast chart + Category breakdown ── */}
            <div id="forecast" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main forecast area chart */}
                <ChartCard title="📈 30-Day Revenue Forecast" subtitle="All categories combined with confidence bands" className="lg:col-span-2 animate-slide-up">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyForecast}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    tickFormatter={(v: number) => `₹${(v / 1e7).toFixed(0)}Cr`} />
                                <Tooltip
                                    contentStyle={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", color: "#334155", fontSize: "13px", fontWeight: 600, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
                                    wrapperStyle={{ zIndex: 99999 }}
                                    labelStyle={{ color: "#94a3b8", fontSize: "11px", marginBottom: "4px" }}
                                    formatter={(v: number) => fmt(v)}
                                />
                                <Area type="monotone" dataKey="upper" stroke="none"
                                    fill="#8b5cf6" fillOpacity={0.08} name="Upper Bound" />
                                <Area type="monotone" dataKey="lower" stroke="none"
                                    fill="#8b5cf6" fillOpacity={0.08} name="Lower Bound" />
                                <Area type="monotone" dataKey="total" stroke="#8b5cf6"
                                    fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2}
                                    name="Predicted Revenue" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Category breakdown — clickable for drill-down */}
                <ChartCard title="📊 Category Predictions" subtitle="Click a category to see its forecast" className="animate-slide-up">
                    <div className="space-y-2">
                        {catSummary.map((cat: any, i: number) => {
                            const isSelected = selectedCategory === cat.category;
                            return (
                                <div
                                    key={cat.category}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                        ? "bg-black/[0.04] border-accent-purple/30"
                                        : "bg-black/[0.02] border-black/[0.04] hover:bg-black/[0.03]"
                                        }`}
                                    onClick={() => setSelectedCategory(isSelected ? null : cat.category)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">
                                                {cat.category}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {fmt(cat.next_30d_predicted)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <TrendIcon trend={cat.trend} />
                                        <span className={`text-xs font-medium ${cat.change_pct > 0 ? "text-emerald-400" :
                                            cat.change_pct < 0 ? "text-red-400" : "text-slate-400"
                                            }`}>
                                            {cat.change_pct > 0 ? "+" : ""}{cat.change_pct}%
                                        </span>
                                        {isSelected ? <ChevronUp className="w-3 h-3 text-accent-purple ml-1" /> : <ChevronDown className="w-3 h-3 text-slate-600 ml-1" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ChartCard>
            </div>

            {/* ── Category Drill-Down Panel ── */}
            {selectedCategory && (() => {
                const catData = getCategoryForecast(selectedCategory);
                const catInfo = catSummary.find((c: any) => c.category === selectedCategory);
                const catColor = catColorMap[selectedCategory] || "#8b5cf6";
                const catMetrics = metrics.per_category?.[selectedCategory];

                return (
                    <div ref={drillDownRef} className="glass-card-static p-5 animate-slide-up" style={{ border: `1px solid ${catColor}25` }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${catColor}15` }}>
                                    <TrendingUp className="w-4.5 h-4.5" style={{ color: catColor }} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">{selectedCategory} — 30-Day Forecast</h4>
                                    <p className="text-xs text-slate-500">
                                        Predicted: {fmt(catInfo?.next_30d_predicted || 0)} · Actual (last 30d): {fmt(catInfo?.last_30d_actual || 0)} · Change: <span className={catInfo?.change_pct > 0 ? "text-emerald-400" : "text-red-400"}>{catInfo?.change_pct > 0 ? "+" : ""}{catInfo?.change_pct}%</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCategory(null)} className="text-slate-500 hover:text-slate-800 transition-colors p-1 rounded-lg hover:bg-black/[0.05]">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                            {/* Category forecast chart */}
                            <div className="lg:col-span-3 h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={catData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                        <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} />
                                        <Tooltip
                                            contentStyle={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", color: "#334155", fontSize: "13px", fontWeight: 600, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
                                            wrapperStyle={{ zIndex: 99999 }}
                                            labelStyle={{ color: "#94a3b8", fontSize: "11px" }}
                                            formatter={(v: number) => fmt(v)}
                                        />
                                        <Area type="monotone" dataKey="upper" stroke="none" fill={catColor} fillOpacity={0.08} name="Upper" />
                                        <Area type="monotone" dataKey="lower" stroke="none" fill={catColor} fillOpacity={0.08} name="Lower" />
                                        <Area type="monotone" dataKey="predicted" stroke={catColor} fill={catColor} fillOpacity={0.2} strokeWidth={2} name="Predicted" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Category metrics sidebar */}
                            <div className="space-y-3">
                                {catMetrics && (
                                    <>
                                        <div className="p-3 rounded-xl" style={{ background: `${catColor}08`, border: `1px solid ${catColor}15` }}>
                                            <p className="text-[10px] text-slate-500 uppercase font-semibold">R² Score</p>
                                            <p className={`text-xl font-bold mt-1 ${catMetrics.r2 > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                {(catMetrics.r2 * 100).toFixed(1)}%
                                            </p>
                                            <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, catMetrics.r2 * 100)}%`, background: catMetrics.r2 > 0.1 ? "#10b981" : catMetrics.r2 > 0 ? "#f59e0b" : "#ef4444" }} />
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.04)" }}>
                                            <p className="text-[10px] text-slate-500 uppercase font-semibold">MAE</p>
                                            <p className="text-lg font-bold text-slate-800 mt-1">{fmt(catMetrics.mae)}</p>
                                        </div>
                                        <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.04)" }}>
                                            <p className="text-[10px] text-slate-500 uppercase font-semibold">MSE</p>
                                            <p className="text-sm font-bold text-slate-800 mt-1">{fmt(catMetrics.mse)}</p>
                                        </div>
                                    </>
                                )}
                                <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.04)" }}>
                                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Trend</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <TrendIcon trend={catInfo?.trend || "stable"} />
                                        <span className={`text-sm font-bold capitalize ${catInfo?.trend === "rising" ? "text-emerald-400" :
                                            catInfo?.trend === "falling" ? "text-red-400" : "text-slate-400"
                                            }`}>{catInfo?.trend || "stable"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Per-category bar chart + Model metrics ── */}
            <div id="model" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category revenue bar chart */}
                <ChartCard title="🏆 Predicted vs Actual" subtitle="Last 30d actual vs next 30d predicted" className="animate-slide-up">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={catSummary} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    tickFormatter={(v: number) => `₹${(v / 1e7).toFixed(0)}Cr`} />
                                <YAxis type="category" dataKey="category" width={100}
                                    tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", color: "#334155", fontSize: "13px", fontWeight: 600, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
                                    wrapperStyle={{ zIndex: 99999 }}
                                    formatter={(v: number) => fmt(v)}
                                />
                                <Legend />
                                <Bar dataKey="last_30d_actual" name="Last 30 Days (Actual)"
                                    fill="#64748b" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="next_30d_predicted" name="Next 30 Days (Predicted)"
                                    fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Model performance per category */}
                <ChartCard title="🧠 Model Performance by Category" subtitle="R², MAE and MSE per category" className="animate-slide-up">
                    {metrics.per_category ? (
                        <div className="space-y-2">
                            <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 font-medium px-3 pb-2 border-b border-black/[0.06]">
                                <span>Category</span>
                                <span className="text-right">R²</span>
                                <span className="text-right">MAE</span>
                                <span className="text-right">MSE</span>
                            </div>
                            {Object.entries(metrics.per_category).map(([cat, m]: [string, any], i: number) => (
                                <div
                                    key={cat}
                                    className={`grid grid-cols-4 gap-2 text-sm px-3 py-2.5 rounded-lg transition-all cursor-pointer ${selectedCategory === cat ? "bg-black/[0.04] border border-accent-purple/20" : "hover:bg-black/[0.02] border border-transparent"
                                        }`}
                                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                                >
                                    <span className="text-slate-800 font-medium flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        {cat}
                                    </span>
                                    <span className={`text-right font-mono ${m.r2 > 0.1 ? "text-emerald-400" :
                                        m.r2 > 0 ? "text-amber-400" : "text-red-400"
                                        }`}>
                                        {(m.r2 * 100).toFixed(1)}%
                                    </span>
                                    <span className="text-right text-slate-400 font-mono text-xs">
                                        {fmt(m.mae)}
                                    </span>
                                    <span className="text-right text-slate-400 font-mono text-xs">
                                        {fmt(m.mse)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No per-category metrics available.</p>
                    )}
                </ChartCard>
            </div>

            {/* ── Training loss chart ── */}
            {history.length > 0 && (
                <div id="training">
                    <ChartCard title="📉 Training Loss" subtitle="Last 5 epochs per category (MSE loss)" className="animate-slide-up">
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                    <XAxis dataKey="epoch" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", color: "#334155", fontSize: "13px", fontWeight: 600, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
                                        wrapperStyle={{ zIndex: 99999 }}
                                        labelStyle={{ color: "#94a3b8", fontSize: "11px" }}
                                    />
                                    <Line type="monotone" dataKey="loss" stroke="#f59e0b"
                                        strokeWidth={2} dot={{ r: 2, fill: "#f59e0b" }}
                                        name="Loss (MSE)" />
                                </LineChart>
                            </ResponsiveContainer>
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
