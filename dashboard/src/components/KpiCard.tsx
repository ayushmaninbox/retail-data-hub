import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
    title: string;
    value: string;
    change?: string;
    trend?: "up" | "down" | "neutral";
    icon: LucideIcon;
    accentColor?: string;
    subtitle?: string;
    onClick?: () => void;
}

export default function KpiCard({
    title,
    value,
    change,
    trend = "neutral",
    icon: Icon,
    accentColor = "from-accent-purple to-accent-blue",
    subtitle,
    onClick,
}: KpiCardProps) {
    const trendColor =
        trend === "up"
            ? "text-emerald-600"
            : trend === "down"
                ? "text-red-500"
                : "text-slate-400";

    const TrendIcon =
        trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

    const clickable = !!onClick;

    return (
        <div
            className={`glass-card p-5 relative overflow-hidden group ${clickable ? "cursor-pointer hover:ring-1 hover:ring-accent-purple/30" : ""}`}
            onClick={onClick}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === "Enter") onClick?.(); } : undefined}
        >
            {/* Gradient accent glow */}
            <div
                className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${accentColor} rounded-full opacity-[0.07] blur-2xl group-hover:opacity-[0.12] transition-opacity`}
            />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                    <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentColor} flex items-center justify-center opacity-90`}
                    >
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                        {change && (
                            <div
                                className={`flex items-center gap-1 text-xs font-semibold ${trendColor} px-2 py-1 rounded-full bg-black/[0.03]`}
                            >
                                <TrendIcon className="w-3 h-3" />
                                {change}
                            </div>
                        )}
                        {clickable && (
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-accent-purple transition-colors" />
                        )}
                    </div>
                </div>

                <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
                {subtitle && (
                    <p className="text-xs text-slate-400 mt-1">
                        {subtitle}
                        {clickable && <span className="ml-1 text-accent-purple/60">· Click for details</span>}
                    </p>
                )}
            </div>
        </div>
    );
}
