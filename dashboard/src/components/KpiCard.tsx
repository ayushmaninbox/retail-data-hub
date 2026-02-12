import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
    title: string;
    value: string;
    change?: string;
    trend?: "up" | "down" | "neutral";
    icon: LucideIcon;
    accentColor?: string;
    subtitle?: string;
}

export default function KpiCard({
    title,
    value,
    change,
    trend = "neutral",
    icon: Icon,
    accentColor = "from-accent-purple to-accent-blue",
    subtitle,
}: KpiCardProps) {
    const trendColor =
        trend === "up"
            ? "text-emerald-400"
            : trend === "down"
                ? "text-red-400"
                : "text-slate-400";

    const TrendIcon =
        trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

    return (
        <div className="glass-card p-5 relative overflow-hidden group">
            {/* Gradient accent glow */}
            <div
                className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${accentColor} rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}
            />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                    <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentColor} flex items-center justify-center opacity-80`}
                    >
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    {change && (
                        <div
                            className={`flex items-center gap-1 text-xs font-semibold ${trendColor} px-2 py-1 rounded-full bg-white/[0.04]`}
                        >
                            <TrendIcon className="w-3 h-3" />
                            {change}
                        </div>
                    )}
                </div>

                <p className="text-sm text-slate-400 font-medium mb-1">{title}</p>
                <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                {subtitle && (
                    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
