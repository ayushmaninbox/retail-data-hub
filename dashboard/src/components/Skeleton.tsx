export default function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-xl bg-black/[0.05] ${className}`}
        />
    );
}

export function CardSkeleton() {
    return (
        <div className="glass-card p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
        </div>
    );
}

export function ChartSkeleton({ height = "h-72" }: { height?: string }) {
    return (
        <div className="glass-card p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className={`${height} w-full`} />
        </div>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="glass-card p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
            <div className="space-y-2 mt-4">
                {Array.from({ length: rows }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        </div>
    );
}

export function PageSkeleton() {
    return (
        <div className="space-y-6 animate-fade-in">
            <Skeleton className="h-8 w-60" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
            <ChartSkeleton />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartSkeleton />
                <ChartSkeleton />
            </div>
        </div>
    );
}
