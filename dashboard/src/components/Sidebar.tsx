"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BarChart3,
    Package,
    Truck,
    Users,
    ShoppingCart,
    ShieldCheck,
    TrendingUp,
    Sparkles,
    Database,
} from "lucide-react";

const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/chat", label: "AI Assistant", icon: Sparkles },
    { href: "/tables", label: "Data Tables", icon: Database },
    { href: "/sales", label: "Sales Analytics", icon: BarChart3 },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/logistics", label: "Logistics", icon: Truck },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/market-basket", label: "Market Basket", icon: ShoppingCart },
    { href: "/data-quality", label: "Data Quality", icon: ShieldCheck },
    { href: "/forecast", label: "Forecast", icon: TrendingUp },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-slate-200 bg-white/90 backdrop-blur-xl flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-teal flex items-center justify-center shadow-lg shadow-accent-purple/20">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight">
                        Retail Hub
                    </h1>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                        Data Platform
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <p className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Dashboard
                </p>
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                ? "bg-accent-purple/10 text-accent-purple border border-accent-purple/20 shadow-sm"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                }`}
                        >
                            <Icon
                                className={`w-[18px] h-[18px] transition-colors ${isActive
                                    ? "text-accent-purple"
                                    : "text-slate-500 group-hover:text-slate-800"
                                    }`}
                            />
                            {item.label}
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-white/[0.06]">
                <div className="glass-card p-3 text-center">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Hackathon 2026
                    </p>
                    <p className="text-xs font-semibold text-slate-300 mt-0.5">
                        Team SixSevenCoders
                    </p>
                </div>
            </div>
        </aside>
    );
}
