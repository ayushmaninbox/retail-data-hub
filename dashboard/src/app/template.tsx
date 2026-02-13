"use client";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <div className="will-change-transform">
            {children}
        </div>
    );
}
