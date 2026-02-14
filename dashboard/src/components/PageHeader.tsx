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
        <div className="mb-6 lg:mb-10 animate-fade-in">
            <div className="flex items-center gap-3 lg:gap-4 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple/15 to-accent-blue/15 flex items-center justify-center border border-accent-purple/15 flex-shrink-0">
                    <Icon className="w-5 h-5 text-accent-purple" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                    {title}
                </h1>
            </div>
            <p className="text-sm lg:text-base text-slate-700 font-medium lg:ml-14 leading-relaxed">{subtitle}</p>
        </div>
    );
}
