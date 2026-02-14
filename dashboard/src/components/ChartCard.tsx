interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}

export default function ChartCard({
    title,
    subtitle,
    children,
    className = "",
    action,
}: ChartCardProps) {
    return (
        <div className={`glass-card-static p-6 ${className}`}>
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight mb-0.5">{title}</h3>
                    {subtitle && (
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">{subtitle}</p>
                    )}
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}
