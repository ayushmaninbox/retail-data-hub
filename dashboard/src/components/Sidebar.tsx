"use client";

import {
  Github,
  Linkedin,
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Users,
  Package,
  Brain,
  Activity,
  Settings,
  TrendingUp,
  Database,
  Shield,
  AlertTriangle,
  Radio,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-900/20">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Retail Hub</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Analytics System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-8 overflow-y-auto py-4">
        <div>
          <div className="px-3 mb-5 text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
            Main Console
          </div>
          <div className="space-y-1">
            <NavItem href="/" icon={LayoutDashboard} label="Overview" active={pathname === "/"} />
            <NavItem href="/sales" icon={ShoppingCart} label="Sales Insights" active={pathname === "/sales"} />
            <NavItem href="/logistics" icon={Truck} label="Logistics" active={pathname === "/logistics"} />
            <NavItem href="/customers" icon={Users} label="Customers" active={pathname === "/customers"} />
            <NavItem href="/inventory" icon={Package} label="Inventory" active={pathname === "/inventory"} />
          </div>
        </div>

        <div>
          <div className="px-3 mb-5 text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-cyan-500 rounded-full" />
            Real-Time
          </div>
          <div className="space-y-1">
            <NavItem href="/live" icon={Radio} label="Live Transactions" active={pathname === "/live"} />
          </div>
        </div>

        <div>
          <div className="px-3 mb-5 text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
            Intelligence
          </div>
          <div className="space-y-1">
            <NavItem href="/chat" icon={Brain} label="Retail Brain AI" active={pathname === "/chat"} />
            <NavItem href="/forecast" icon={TrendingUp} label="Forecasting" active={pathname === "/forecast"} />
            <NavItem href="/market-basket" icon={Activity} label="Product Analysis" active={pathname === "/market-basket"} />
          </div>
        </div>

        <div>
          <div className="px-3 mb-5 text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-red-500 rounded-full" />
            Security
          </div>
          <div className="space-y-1">
            <NavItem href="/anomalies" icon={AlertTriangle} label="Anomaly Detection" active={pathname === "/anomalies"} />
            <NavItem href="/fraud" icon={Shield} label="Fraud Monitor" active={pathname === "/fraud"} />
          </div>
        </div>

        <div>
          <div className="px-3 mb-5 text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            Infrastructure
          </div>
          <div className="space-y-1">
            <NavItem href="/tables" icon={Database} label="Data Explorer" active={pathname === "/tables"} />
            <NavItem href="/data-quality" icon={Activity} label="Data Health" active={pathname === "/data-quality"} />
          </div>
        </div>
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-4 py-1 text-slate-400">
          </div>
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider text-center">
            Made by <span className="text-indigo-400">Team SixSevenCoders</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${active
        ? "bg-indigo-600/10 text-indigo-400 font-medium"
        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
      <span className="text-base font-medium">{label}</span>
    </Link>
  );
}
