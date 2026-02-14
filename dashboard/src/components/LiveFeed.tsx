"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Activity, Zap, AlertTriangle, Shield } from "lucide-react";

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

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/live";

const EVENT_STYLES: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    normal: { color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: Activity, label: "Normal" },
    anomaly: { color: "#eab308", bg: "rgba(234,179,8,0.08)", icon: AlertTriangle, label: "Anomaly" },
    fraud: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: Shield, label: "Fraud" },
};

export default function LiveFeed() {
    const [connected, setConnected] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<LiveStats>({
        total_revenue: 0,
        total_transactions: 0,
        anomaly_count: 0,
        fraud_count: 0,
    });
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            console.log("🟢 LiveFeed connected");
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "transaction") {
                    setTransactions((prev) => [msg.data, ...prev].slice(0, 50));
                    if (msg.stats) setStats(msg.stats);
                } else if (msg.type === "stats") {
                    if (msg.data) setStats(msg.data);
                }
            } catch (e) {
                console.error("LiveFeed parse error:", e);
            }
        };

        ws.onclose = () => {
            setConnected(false);
            console.log("🔴 LiveFeed disconnected, reconnecting in 5s…");
            reconnectTimeout.current = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
            ws.close();
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            wsRef.current?.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [connect]);

    const fmtCurrency = (n: number) => {
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    };

    return (
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Live Transaction Feed</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${connected ? "text-green-600" : "text-red-500"}`}>
                        {connected ? "Live" : "Offline"}
                    </span>
                </div>
            </div>

            {/* Mini KPI bar */}
            <div className="grid grid-cols-4 gap-px bg-slate-100/80">
                {[
                    { label: "Revenue", value: fmtCurrency(stats.total_revenue), color: "text-emerald-600" },
                    { label: "Transactions", value: stats.total_transactions.toLocaleString(), color: "text-indigo-600" },
                    { label: "Anomalies", value: String(stats.anomaly_count), color: "text-amber-600" },
                    { label: "Fraud Flags", value: String(stats.fraud_count), color: "text-red-600" },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white/80 p-2.5 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{kpi.label}</p>
                        <p className={`text-sm font-black ${kpi.color} mt-0.5`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Transaction list */}
            <div className="max-h-[340px] overflow-y-auto">
                {transactions.length === 0 ? (
                    <div className="p-8 text-center">
                        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
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
                                className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100/60 hover:bg-slate-50/50 transition-all duration-300 animate-slide-up"
                                style={{ animationDelay: `${i * 0.02}s` }}
                            >
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: style.bg }}
                                >
                                    <Icon className="w-4 h-4" style={{ color: style.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-800 truncate">
                                            {txn.product_name}
                                        </span>
                                        {txn.event_type !== "normal" && (
                                            <span
                                                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-white"
                                                style={{ background: style.color }}
                                            >
                                                {style.label}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        {txn.city} · {txn.channel} · Qty {txn.quantity}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold text-slate-800">
                                        {fmtCurrency(txn.total_amount)}
                                    </p>
                                    <p className="text-[9px] text-slate-400">
                                        {new Date(txn.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
