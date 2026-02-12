import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
    title: string;
    subtitle: string;
    icon: LucideIcon;
}

export default function PageHeader({
    title,
    subtitle,
    icon: Icon,
}: PageHeaderProps) {
    return (
        <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 flex items-center justify-center border border-accent-purple/20">
                    <Icon className="w-4 h-4 text-accent-purple" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                    {title}
                </h1>
            </div>
            <p className="text-sm text-slate-500 ml-11">{subtitle}</p>
        </div>
    );
}
