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
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    {subtitle && (
                        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                    )}
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}
