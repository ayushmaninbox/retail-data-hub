"use client";

import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import { Package, RotateCcw, AlertTriangle, Layers } from "lucide-react";
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

const priorityColors: Record<string, string> = {
    High: "text-red-400 bg-red-400/10",
    Medium: "text-amber-400 bg-amber-400/10",
    Low: "text-emerald-400 bg-emerald-400/10",
};

export default function InventoryPage() {
    const { data, loading } = useApi<any>("/api/operations");

    if (loading || !data) return <PageSkeleton />;

    const turnoverData = (data.inventory_turnover?.by_category || []).map((c: any) => ({
        category: c.category,
        turnover: c.turnover_ratio,
    }));

    const stockout = data.stockout_rate?.overall || {};
    const reorderAlerts = (data.reorder_alerts || []).map((r: any) => ({
        product: r.product_name,
        currentStock: r.quantity_on_hand,
        reorderPoint: r.reorder_level,
        suggestedQty: r.units_to_order,
        priority: r.quantity_on_hand === 0 ? "High" : r.quantity_on_hand < r.reorder_level / 2 ? "High" : "Medium",
        store: `${r.store_city} (${r.store_id})`,
    }));

    const avgTurnover = turnoverData.length > 0
        ? (turnoverData.reduce((s: number, c: any) => s + c.turnover, 0) / turnoverData.length).toFixed(1)
        : "0";

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Package}
                title="Inventory Health"
                subtitle="Stock levels, turnover metrics & reorder recommendations"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard icon={RotateCcw} title="Avg Turnover Ratio" value={`${avgTurnover}x`} change="Across all categories" trend="up" accentColor="from-accent-purple to-accent-blue" subtitle="Higher is better" />
                <KpiCard icon={AlertTriangle} title="Stockout Rate" value={`${stockout.stockout_pct || 0}%`} change={`${stockout.stockout_records || 0} records`} trend="down" accentColor="from-red-500 to-accent-orange" subtitle="Products at zero stock" />
                <KpiCard icon={Package} title="Total Records" value={(stockout.total_records || 0).toLocaleString()} change="Inventory rows" trend="neutral" accentColor="from-accent-blue to-accent-teal" subtitle="In warehouse data" />
                <KpiCard icon={Layers} title="Reorder Alerts" value={`${reorderAlerts.length}`} change="Action needed" trend="down" accentColor="from-amber-500 to-accent-orange" subtitle="Below reorder point" />
            </div>

            <ChartCard title="⚠️ Reorder Alerts" subtitle="Products below reorder level — requires restocking" className="animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {reorderAlerts.slice(0, 6).map((alert: any, i: number) => (
                        <div key={i} className={`p-4 rounded-xl border transition-all hover:scale-[1.02] ${alert.currentStock === 0 ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-mono text-slate-500">{alert.store}</span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${alert.currentStock === 0 ? "text-red-400 bg-red-400/20" : "text-amber-400 bg-amber-400/20"}`}>
                                    {alert.currentStock === 0 ? "stockout" : "low stock"}
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-white mb-1">{alert.product}</p>
                            <p className="text-xs text-slate-400">
                                Stock: <span className="text-white font-semibold">{alert.currentStock}</span> · Reorder at: {alert.reorderPoint} · Order: <span className="text-accent-teal font-semibold">{alert.suggestedQty}</span>
                            </p>
                        </div>
                    ))}
                </div>
            </ChartCard>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Inventory Turnover by Category" subtitle="Higher is better — indicates faster inventory cycling" className="animate-slide-up">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={turnoverData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}x`} />
                                <Tooltip formatter={(value: number) => [`${value}x`, "Turnover"]} contentStyle={{ background: "rgba(15,15,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
                                <Bar dataKey="turnover" radius={[6, 6, 0, 0]} fill="url(#turnoverGrad)" barSize={32} />
                                <defs>
                                    <linearGradient id="turnoverGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#14b8a6" />
                                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Reorder Recommendations" subtitle="Products below reorder point" className="animate-slide-up">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.06]">
                                    <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-3">Product</th>
                                    <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-3">Stock</th>
                                    <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-3">Reorder Pt</th>
                                    <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-3">Suggest Qty</th>
                                    <th className="text-left text-xs font-medium text-slate-500 pb-3">Priority</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reorderAlerts.slice(0, 6).map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                        <td className="py-2.5 pr-3 text-sm text-white font-medium">{item.product}</td>
                                        <td className="py-2.5 pr-3 text-sm text-red-400 font-semibold">{item.currentStock}</td>
                                        <td className="py-2.5 pr-3 text-sm text-slate-400">{item.reorderPoint}</td>
                                        <td className="py-2.5 pr-3 text-sm text-accent-teal font-semibold">{item.suggestedQty}</td>
                                        <td className="py-2.5">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColors[item.priority]}`}>
                                                {item.priority}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}
