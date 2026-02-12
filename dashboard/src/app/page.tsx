"use client";

import {
    IndianRupee,
    ShoppingBag,
    Users,
    CreditCard,
    ArrowUpRight,
} from "lucide-react";
import { LayoutDashboard } from "lucide-react";
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
} from "recharts";

// --- Dummy Data ---
const revenueData = [
    { month: "Jan", revenue: 820000 },
    { month: "Feb", revenue: 932000 },
    { month: "Mar", revenue: 1101000 },
    { month: "Apr", revenue: 1034000 },
    { month: "May", revenue: 1190000 },
    { month: "Jun", revenue: 1230000 },
    { month: "Jul", revenue: 1050000 },
    { month: "Aug", revenue: 1180000 },
    { month: "Sep", revenue: 1320000 },
    { month: "Oct", revenue: 1410000 },
    { month: "Nov", revenue: 1560000 },
    { month: "Dec", revenue: 1610000 },
];

const channelData = [
    { name: "POS (In-Store)", value: 7420000, color: "#8b5cf6" },
    { name: "Web (Online)", value: 5020000, color: "#14b8a6" },
];

const recentOrders = [
    { id: "ORD-8742", customer: "Priya Sharma", city: "Mumbai", amount: "₹3,249", status: "Delivered", date: "Feb 12" },
    { id: "ORD-8741", customer: "Rahul Verma", city: "Delhi", amount: "₹1,899", status: "In Transit", date: "Feb 12" },
    { id: "ORD-8740", customer: "Anita Desai", city: "Bangalore", amount: "₹5,670", status: "Delivered", date: "Feb 11" },
    { id: "ORD-8739", customer: "Vikram Singh", city: "Chennai", amount: "₹2,150", status: "Processing", date: "Feb 11" },
    { id: "ORD-8738", customer: "Meera Patel", city: "Ahmedabad", amount: "₹4,320", status: "Delivered", date: "Feb 10" },
];

const statusColors: Record<string, string> = {
    Delivered: "text-emerald-400 bg-emerald-400/10",
    "In Transit": "text-blue-400 bg-blue-400/10",
    Processing: "text-amber-400 bg-amber-400/10",
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card-static p-3 border border-white/10">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-bold text-white">
                    ₹{(payload[0].value / 100000).toFixed(1)}L
                </p>
            </div>
        );
    }
    return null;
};

export default function OverviewPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                icon={LayoutDashboard}
                title="Overview"
                subtitle="Your retail business at a glance — key metrics and trends"
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
                <KpiCard
                    icon={IndianRupee}
                    title="Total Revenue"
                    value="₹1.24 Cr"
                    change="+12.5%"
                    trend="up"
                    accentColor="from-accent-purple to-accent-blue"
                    subtitle="Last 12 months"
                />
                <KpiCard
                    icon={ShoppingBag}
                    title="Total Orders"
                    value="8,742"
                    change="+8.2%"
                    trend="up"
                    accentColor="from-accent-blue to-accent-teal"
                    subtitle="Last 12 months"
                />
                <KpiCard
                    icon={Users}
                    title="Active Customers"
                    value="3,156"
                    change="+5.7%"
                    trend="up"
                    accentColor="from-accent-teal to-emerald-400"
                    subtitle="Unique buyers"
                />
                <KpiCard
                    icon={CreditCard}
                    title="Avg Order Value"
                    value="₹1,419"
                    change="-2.1%"
                    trend="down"
                    accentColor="from-accent-pink to-accent-orange"
                    subtitle="Per transaction"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                {/* Revenue Trend */}
                <ChartCard
                    title="Revenue Trend"
                    subtitle="Monthly revenue over the past year"
                    className="xl:col-span-2"
                >
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                    tickFormatter={(v) => `₹${v / 100000}L`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#8b5cf6"
                                    strokeWidth={2.5}
                                    fill="url(#revenueGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Channel Mix */}
                <ChartCard title="Channel Mix" subtitle="POS vs Web revenue split">
                    <div className="h-72 flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="70%">
                            <PieChart>
                                <Pie
                                    data={channelData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {channelData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => `₹${(value / 100000).toFixed(1)}L`}
                                    contentStyle={{
                                        background: "rgba(15,15,35,0.95)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                        color: "#fff",
                                        fontSize: "12px",
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex gap-6 mt-2">
                            {channelData.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ background: item.color }}
                                    />
                                    <span className="text-xs text-slate-400">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </ChartCard>
            </div>

            {/* Recent Orders */}
            <ChartCard
                title="Recent Orders"
                subtitle="Latest transactions across all channels"
                className="animate-slide-up"
                action={
                    <button className="flex items-center gap-1 text-xs font-medium text-accent-purple hover:text-accent-blue transition-colors">
                        View All <ArrowUpRight className="w-3 h-3" />
                    </button>
                }
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Order ID</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Customer</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">City</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Amount</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Status</th>
                                <th className="text-left text-xs font-medium text-slate-500 pb-3">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="py-3 pr-4 text-sm font-mono text-accent-purple">{order.id}</td>
                                    <td className="py-3 pr-4 text-sm text-white">{order.customer}</td>
                                    <td className="py-3 pr-4 text-sm text-slate-400">{order.city}</td>
                                    <td className="py-3 pr-4 text-sm font-semibold text-white">{order.amount}</td>
                                    <td className="py-3 pr-4">
                                        <span
                                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[order.status]
                                                }`}
                                        >
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="py-3 text-sm text-slate-500">{order.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ChartCard>
        </div>
    );
}
