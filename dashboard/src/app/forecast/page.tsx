"use client";

import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
    TrendingUp, Brain, Target, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

const fmt = (n: number) =>
    n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` :
    n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` :
    `₹${n.toLocaleString("en-IN")}`;

const COLORS = [
    "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981",
    "#ef4444", "#ec4899", "#3b82f6", "#84cc16",
];

export default function ForecastPage() {
    const { data: rawData, loading, error } = useApi("/api/forecast");

    if (loading) return <PageSkeleton />;
    if (error || !rawData || (rawData as any).error) {
        return (
            <div className="p-8">
                <div className="glass-card p-8 text-center">
                    <Brain className="w-12 h-12 text-accent-purple mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Forecast Not Available</h2>
                    <p className="text-slate-400">
                        Run <code className="text-accent-teal bg-white/5 px-2 py-1 rounded">
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

    // Prepare chart data: aggregate forecast by date
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
        date: d.date.slice(5), // MM-DD
        total: Math.round(d.total),
        lower: Math.round(d.lower),
        upper: Math.round(d.upper),
    }));

    // Trend icon
    const TrendIcon = ({ trend }: { trend: string }) =>
        trend === "rising" ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> :
        trend === "falling" ? <ArrowDownRight className="w-4 h-4 text-red-400" /> :
        <Minus className="w-4 h-4 text-slate-400" />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Brain className="w-7 h-7 text-accent-purple" />
                    LSTM Demand Forecast
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    {config.layers}-layer LSTM · {config.hidden_dim} hidden units ·
                    {config.sequence_length}-day lookback · {config.forecast_horizon_days}-day horizon
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                        30-Day Predicted Revenue
                    </p>
                    <p className="text-2xl font-bold text-white mt-2">
                        {fmt(summary.total_30d_predicted_revenue || 0)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Across {summary.categories_trained || 0} categories
                    </p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                        Top Growth Category
                    </p>
                    <p className="text-2xl font-bold text-emerald-400 mt-2">
                        {summary.top_growth_category || "N/A"}
                    </p>
                    <p className="text-xs text-emerald-400/80 mt-1">
                        +{summary.top_growth_pct || 0}% predicted increase
                    </p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                        Model Accuracy (R²)
                    </p>
                    <p className="text-2xl font-bold text-accent-purple mt-2">
                        {((metrics.avg_r2 || 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Avg across all categories
                    </p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                        Mean Abs Error
                    </p>
                    <p className="text-2xl font-bold text-accent-teal mt-2">
                        {fmt(metrics.avg_mae || 0)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Average prediction deviation
                    </p>
                </div>
            </div>

            {/* Forecast chart + Category breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main forecast area chart */}
                <div className="lg:col-span-2 glass-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">
                        📈 30-Day Revenue Forecast (All Categories)
                    </h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={dailyForecast}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }}
                                   tickFormatter={(v: number) => `₹${(v / 1e7).toFixed(0)}Cr`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                                labelStyle={{ color: "#f8fafc" }}
                                formatter={(v: number) => fmt(v)}
                            />
                            <Area type="monotone" dataKey="upper" stroke="none"
                                  fill="#8b5cf6" fillOpacity={0.1} name="Upper Bound" />
                            <Area type="monotone" dataKey="lower" stroke="none"
                                  fill="#8b5cf6" fillOpacity={0.1} name="Lower Bound" />
                            <Area type="monotone" dataKey="total" stroke="#8b5cf6"
                                  fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2}
                                  name="Predicted Revenue" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Category breakdown */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">
                        📊 Category Predictions (30 Days)
                    </h3>
                    <div className="space-y-3">
                        {catSummary.map((cat: any, i: number) => (
                            <div key={cat.category}
                                 className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full"
                                         style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {cat.category}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {fmt(cat.next_30d_predicted)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <TrendIcon trend={cat.trend} />
                                    <span className={`text-xs font-medium ${
                                        cat.change_pct > 0 ? "text-emerald-400" :
                                        cat.change_pct < 0 ? "text-red-400" : "text-slate-400"
                                    }`}>
                                        {cat.change_pct > 0 ? "+" : ""}{cat.change_pct}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Per-category bar chart + Model metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category revenue bar chart */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">
                        🏆 Predicted vs Actual (Last 30d vs Next 30d)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={catSummary} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }}
                                   tickFormatter={(v: number) => `₹${(v / 1e7).toFixed(0)}Cr`} />
                            <YAxis type="category" dataKey="category" width={100}
                                   tick={{ fill: "#94a3b8", fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
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

                {/* Model performance per category */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">
                        🧠 Model Performance by Category
                    </h3>
                    {metrics.per_category ? (
                        <div className="space-y-2">
                            <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 font-medium px-3 pb-2 border-b border-white/[0.06]">
                                <span>Category</span>
                                <span className="text-right">R²</span>
                                <span className="text-right">MAE</span>
                                <span className="text-right">MSE</span>
                            </div>
                            {Object.entries(metrics.per_category).map(([cat, m]: [string, any], i: number) => (
                                <div key={cat} className="grid grid-cols-4 gap-2 text-sm px-3 py-2 rounded-lg hover:bg-white/[0.02]">
                                    <span className="text-white font-medium flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full"
                                             style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        {cat}
                                    </span>
                                    <span className={`text-right ${
                                        m.r2 > 0.7 ? "text-emerald-400" :
                                        m.r2 > 0.4 ? "text-amber-400" : "text-red-400"
                                    }`}>
                                        {(m.r2 * 100).toFixed(1)}%
                                    </span>
                                    <span className="text-right text-slate-400">
                                        {fmt(m.mae)}
                                    </span>
                                    <span className="text-right text-slate-400">
                                        {fmt(m.mse)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No per-category metrics available.</p>
                    )}
                </div>
            </div>

            {/* Training loss chart */}
            {history.length > 0 && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">
                        📉 Training Loss (Last 5 Epochs per Category)
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="epoch" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                                labelStyle={{ color: "#f8fafc" }}
                            />
                            <Line type="monotone" dataKey="loss" stroke="#f59e0b"
                                  strokeWidth={2} dot={{ r: 2, fill: "#f59e0b" }}
                                  name="Loss (MSE)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
