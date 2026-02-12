"use client";

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

// --- Dummy Data ---
const turnoverByCategory = [
    { category: "Electronics", turnover: 8.2 },
    { category: "Accessories", turnover: 12.5 },
    { category: "Home & Living", turnover: 6.8 },
    { category: "Fashion", turnover: 9.4 },
    { category: "Food & Bev", turnover: 18.3 },
    { category: "Health", turnover: 7.1 },
    { category: "Sports", turnover: 5.6 },
    { category: "Books", turnover: 4.2 },
];

const stockoutAlerts = [
    { product: "Wireless Earbuds", sku: "SKU-1024", store: "Mumbai-Central", daysOut: 3, severity: "critical" },
    { product: "USB-C Hub", sku: "SKU-2048", store: "Delhi-CP", daysOut: 1, severity: "critical" },
    { product: "Phone Case (Black)", sku: "SKU-3072", store: "Bangalore-MG", daysOut: 5, severity: "warning" },
    { product: "Screen Protector", sku: "SKU-4096", store: "Chennai-T.Nagar", daysOut: 2, severity: "critical" },
    { product: "Power Bank 20K", sku: "SKU-5120", store: "Pune-FC Road", daysOut: 7, severity: "warning" },
];

const reorderTable = [
    { product: "Wireless Earbuds", currentStock: 12, reorderPoint: 50, suggestedQty: 200, priority: "High" },
    { product: "USB-C Hub", currentStock: 5, reorderPoint: 30, suggestedQty: 150, priority: "High" },
    { product: "Screen Protector", currentStock: 18, reorderPoint: 40, suggestedQty: 120, priority: "High" },
    { product: "Phone Case", currentStock: 45, reorderPoint: 60, suggestedQty: 100, priority: "Medium" },
    { product: "Power Bank 20K", currentStock: 28, reorderPoint: 35, suggestedQty: 80, priority: "Medium" },
    { product: "Bluetooth Speaker", currentStock: 32, reorderPoint: 40, suggestedQty: 90, priority: "Low" },
];

const priorityColors: Record<string, string> = {
    High: "text-red-400 bg-red-400/10",
    Medium: "text-amber-400 bg-amber-400/10",
    Low: "text-emerald-400 bg-emerald-400/10",
};

export default function InventoryPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                icon={Package}
                title="Inventory Health"
                subtitle="Stock levels, turnover metrics & reorder recommendations"
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard
                    icon={RotateCcw}
                    title="Avg Turnover Ratio"
                    value="9.0x"
                    change="+1.2x"
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="Across all categories"
                />
                <KpiCard
                    icon={AlertTriangle}
                    title="Stockout Rate"
                    value="4.2%"
                    change="-0.8%"
                    trend="up"
                    accentColor="from-red-500 to-accent-orange"
                    subtitle="Products at zero stock"
                />
                <KpiCard
                    icon={Package}
                    title="Total SKUs"
                    value="1,284"
                    change="+32"
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="Active products"
                />
                <KpiCard
                    icon={Layers}
                    title="Reorder Alerts"
                    value="6"
                    change="Action needed"
                    trend="down"
                    accentColor="from-amber-500 to-accent-orange"
                    subtitle="Below reorder point"
                />
            </div>

            {/* Stockout Alerts */}
            <ChartCard
                title="⚠️ Stockout Alerts"
                subtitle="Products at or near zero stock — requires immediate action"
                className="animate-slide-up"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {stockoutAlerts.map((alert) => (
                        <div
                            key={alert.sku}
                            className={`p-4 rounded-xl border transition-all hover:scale-[1.02] ${alert.severity === "critical"
                                    ? "border-red-500/20 bg-red-500/5"
                                    : "border-amber-500/20 bg-amber-500/5"
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-mono text-slate-500">{alert.sku}</span>
                                <span
                                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${alert.severity === "critical"
                                            ? "text-red-400 bg-red-400/20"
                                            : "text-amber-400 bg-amber-400/20"
                                        }`}
                                >
                                    {alert.severity}
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-white mb-1">{alert.product}</p>
                            <p className="text-xs text-slate-400">
                                {alert.store} · Out for{" "}
                                <span className="text-white font-semibold">{alert.daysOut} days</span>
                            </p>
                        </div>
                    ))}
                </div>
            </ChartCard>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Turnover by Category */}
                <ChartCard
                    title="Inventory Turnover by Category"
                    subtitle="Higher is better — indicates faster inventory cycling"
                    className="animate-slide-up"
                >
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={turnoverByCategory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 10 }}
                                    angle={-20}
                                    textAnchor="end"
                                    height={50}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                    tickFormatter={(v) => `${v}x`}
                                />
                                <Tooltip
                                    formatter={(value: number) => [`${value}x`, "Turnover"]}
                                    contentStyle={{
                                        background: "rgba(15,15,35,0.95)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                        color: "#fff",
                                        fontSize: "12px",
                                    }}
                                />
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

                {/* Reorder Recommendations */}
                <ChartCard
                    title="Reorder Recommendations"
                    subtitle="Products below reorder point"
                    className="animate-slide-up"
                >
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
                                {reorderTable.map((item) => (
                                    <tr
                                        key={item.product}
                                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="py-2.5 pr-3 text-sm text-white font-medium">{item.product}</td>
                                        <td className="py-2.5 pr-3 text-sm text-red-400 font-semibold">{item.currentStock}</td>
                                        <td className="py-2.5 pr-3 text-sm text-slate-400">{item.reorderPoint}</td>
                                        <td className="py-2.5 pr-3 text-sm text-accent-teal font-semibold">{item.suggestedQty}</td>
                                        <td className="py-2.5">
                                            <span
                                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColors[item.priority]
                                                    }`}
                                            >
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
