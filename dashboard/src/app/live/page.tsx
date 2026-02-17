"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
    Activity,
    Zap,
    AlertTriangle,
    Shield,
    Radio,
    IndianRupee,
    TrendingUp,
    Clock,
} from "lucide-react";
import { WS_URL } from "@/config";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from "recharts";

/* ── Types ── */

interface Transaction {
    event_type: "normal" | "anomaly" | "fraud";
    transaction_id: string;
    timestamp: string;
    customer_id: string;
    store_id: string;
    city: string;
    channel: string;
    product_name: string;
    category: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
}

interface LiveStats {
    total_revenue: number;
    total_transactions: number;
    anomaly_count: number;
    fraud_count: number;
}

/* ── Constants ── */



const EVENT_STYLES: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    normal: { color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: Activity, label: "Normal" },
    anomaly: { color: "#eab308", bg: "rgba(234,179,8,0.08)", icon: AlertTriangle, label: "Anomaly" },
    fraud: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: Shield, label: "Fraud" },
};

const CATEGORY_COLORS = [
    "#8b5cf6", "#3b82f6", "#14b8a6", "#f59e0b",
    "#ec4899", "#ef4444", "#22c55e", "#6366f1",
];

const CITY_COLORS = [
    "#8b5cf6", "#3b82f6", "#14b8a6", "#f59e0b", "#ec4899",
    "#ef4444", "#22c55e", "#6366f1", "#f97316", "#a855f7",
];

/* ── Helpers ── */

function fmtCurrency(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtNum(n: number): string {
    return n.toLocaleString("en-IN");
}

/* ── Tooltip ── */

const GlassTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card-dark p-4 border border-white/10 max-w-xs shadow-2xl rounded-2xl">
                <p className="text-sm text-slate-400 mb-2 font-bold tracking-tight">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color || p.stroke }} />
                                <span className="text-xs font-medium text-slate-300">{p.name}</span>
                            </div>
                            <span className="text-sm font-black text-white">
                                {p.name === "Revenue" ? fmtCurrency(p.value) : fmtNum(p.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

/* ── Main Page ── */

export default function LivePage() {
    const [connected, setConnected] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<LiveStats>({
        total_revenue: 0, total_transactions: 0, anomaly_count: 0, fraud_count: 0,
    });
    const [revenueTimeline, setRevenueTimeline] = useState<{ time: string; revenue: number; type: string }[]>([]);
    const [categoryMap, setCategoryMap] = useState<Record<string, number>>({});
    const [cityMap, setCityMap] = useState<Record<string, number>>({});
    const [txnsPerMin, setTxnsPerMin] = useState(0);
    const txnTimestamps = useRef<number[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "transaction") {
                    const txn: Transaction = msg.data;

                    // Update transactions list (keep last 100)
                    setTransactions((prev) => [txn, ...prev].slice(0, 100));

                    // Update stats
                    if (msg.stats) setStats(msg.stats);

                    // Update revenue timeline (keep last 50 points)
                    const timeLabel = new Date(txn.timestamp).toLocaleTimeString("en-IN", {
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                    });
                    setRevenueTimeline((prev) => [
                        ...prev, { time: timeLabel, revenue: txn.total_amount, type: txn.event_type },
                    ].slice(-50));

                    // Update category distribution
                    setCategoryMap((prev) => ({
                        ...prev,
                        [txn.category]: (prev[txn.category] || 0) + 1,
                    }));

                    // Update city distribution
                    setCityMap((prev) => ({
                        ...prev,
                        [txn.city]: (prev[txn.city] || 0) + 1,
                    }));

                    // Compute txns/min
                    const now = Date.now();
                    txnTimestamps.current = [...txnTimestamps.current.filter(t => now - t < 60000), now];
                    setTxnsPerMin(txnTimestamps.current.length);

                } else if (msg.type === "stats" && msg.data) {
                    setStats(msg.data);
                }
            } catch (e) {
                console.error("Live parse error:", e);
            }
        };

        ws.onclose = () => {
            setConnected(false);
            reconnectTimeout.current = setTimeout(connect, 5000);
        };
        ws.onerror = () => ws.close();
    }, []);

    useEffect(() => {
        connect();
        return () => {
            wsRef.current?.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [connect]);

    // Derived chart data
    const categoryData = Object.entries(categoryMap)
        .map(([name, value], i) => ({ name, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
        .sort((a, b) => b.value - a.value);

    const cityData = Object.entries(cityMap)
        .map(([city, count], i) => ({ city, count, color: CITY_COLORS[i % CITY_COLORS.length] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <PageHeader
                    icon={Radio}
                    title="Live Transactions"
                    subtitle="Real-time transaction monitoring & analytics"
                />
                <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full glass-card border border-white/5 self-start sm:self-auto mb-4 sm:mb-0">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${connected ? "text-green-600" : "text-red-500"}`}>
                        {connected ? "Live" : "Offline"}
                    </span>
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 animate-slide-up">
                <KpiCard
                    icon={IndianRupee}
                    title="Live Revenue"
                    value={fmtCurrency(stats.total_revenue)}
                    change="Session total"
                    trend="up"
                    accentColor="from-emerald-500 to-emerald-400"
                    subtitle="Since simulator started"
                />
                <KpiCard
                    icon={Zap}
                    title="Transactions"
                    value={fmtNum(stats.total_transactions)}
                    change={`${txnsPerMin}/min`}
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="Total processed"
                />
                <KpiCard
                    icon={Clock}
                    title="Txns / Minute"
                    value={String(txnsPerMin)}
                    change="Rolling 60s"
                    trend="up"
                    accentColor="from-blue-500 to-cyan-400"
                    subtitle="Current throughput"
                />
                <KpiCard
                    icon={AlertTriangle}
                    title="Anomalies"
                    value={String(stats.anomaly_count)}
                    change="Auto-detected"
                    trend="up"
                    accentColor="from-amber-500 to-yellow-400"
                    subtitle="Unusual patterns"
                />
                <KpiCard
                    icon={Shield}
                    title="Fraud Flags"
                    value={String(stats.fraud_count)}
                    change="Suspicious activity"
                    trend="up"
                    accentColor="from-red-500 to-orange-500"
                    subtitle="Rule-triggered"
                />
            </div>

            {/* ── Revenue Timeline ── */}
            <div className="animate-slide-up" style={{ animationDelay: "0.05s" }}>
                <ChartCard title="Revenue Stream" subtitle="Live transaction amounts over time (last 50)">
                    <div className="h-64 lg:h-72">
                        {revenueTimeline.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center">
                                    <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3 animate-pulse" />
                                    <p className="text-sm text-slate-500">Waiting for live data…</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Start the simulator: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">./scripts/live_simulator.sh</code>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueTimeline}>
                                    <defs>
                                        <linearGradient id="liveRevGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                    <XAxis
                                        dataKey="time"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 9 }}
                                        interval={Math.max(0, Math.floor(revenueTimeline.length / 8))}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 10 }}
                                        tickFormatter={(v) => fmtCurrency(v)}
                                    />
                                    <Tooltip content={<GlassTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        name="Revenue"
                                        stroke="#8b5cf6"
                                        strokeWidth={2.5}
                                        fill="url(#liveRevGrad)"
                                        activeDot={{ r: 5, strokeWidth: 0, fill: "#8b5cf6" }}
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </ChartCard>
            </div>

            {/* ── Row: Category Donut + City Bars ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                {/* Category Distribution */}
                <ChartCard title="Category Mix" subtitle="Live distribution by product category">
                    <div className="h-64 lg:h-72 flex items-center justify-center">
                        {categoryData.length === 0 ? (
                            <p className="text-sm text-slate-400">Waiting for data…</p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="name"
                                        isAnimationActive={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<GlassTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </ChartCard>

                {/* City Activity */}
                <ChartCard title="City Activity" subtitle="Live transaction count by city">
                    <div className="h-64 lg:h-72">
                        {cityData.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-sm text-slate-400">Waiting for data…</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={cityData} layout="vertical" margin={{ left: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <YAxis
                                        dataKey="city"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                                        width={90}
                                    />
                                    <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                                    <Bar dataKey="count" name="Transactions" radius={[0, 8, 8, 0]} barSize={20} isAnimationActive={false}>
                                        {cityData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </ChartCard>
            </div>

            {/* ── Live Transaction Feed ── */}
            <div className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
                <ChartCard title="Transaction Feed" subtitle="Scrolling real-time transaction log">
                    <div className="max-h-[420px] overflow-y-auto">
                        {transactions.length === 0 ? (
                            <div className="p-10 text-center">
                                <Radio className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm text-slate-500">
                                    {connected ? "Waiting for transactions…" : "Connect the live simulator to start streaming."}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Run: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">./scripts/live_simulator.sh</code>
                                </p>
                            </div>
                        ) : (
                            transactions.map((txn, i) => {
                                const style = EVENT_STYLES[txn.event_type] || EVENT_STYLES.normal;
                                const Icon = style.icon;
                                return (
                                    <div
                                        key={txn.transaction_id + i}
                                        className="flex items-center gap-3 px-4 py-3 border-b border-slate-100/60 hover:bg-slate-50/50 transition-all duration-200"
                                        style={i === 0 ? { animation: "slide-up 0.3s ease-out" } : undefined}
                                    >
                                        {/* Event icon */}
                                        <div
                                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: style.bg }}
                                        >
                                            <Icon className="w-4.5 h-4.5" style={{ color: style.color }} />
                                        </div>

                                        {/* Product + meta */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                                                    {txn.product_name}
                                                </span>
                                                {txn.event_type !== "normal" && (
                                                    <span
                                                        className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase text-white shadow-sm"
                                                        style={{ background: style.color }}
                                                    >
                                                        {style.label}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                                <span className="text-[10px] sm:text-xs text-slate-500 font-medium">{txn.city}</span>
                                                <span className="text-[10px] text-slate-300">·</span>
                                                <span className="text-[10px] sm:text-xs text-slate-500 font-medium">{txn.channel}</span>
                                                <span className="text-[10px] text-slate-300">·</span>
                                                <span className="text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">Qty {txn.quantity}</span>
                                                <span className="hidden sm:inline text-[10px] text-slate-300">·</span>
                                                <span className="hidden sm:inline text-[10px] sm:text-xs text-slate-400 font-medium">{txn.category}</span>
                                            </div>
                                        </div>

                                        {/* Amount + time */}
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-bold text-slate-800">
                                                {fmtCurrency(txn.total_amount)}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {new Date(txn.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}
