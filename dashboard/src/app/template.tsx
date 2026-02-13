"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    useEffect(() => {
        if (!containerRef.current) return;

        // Reset state
        gsap.set(containerRef.current, {
            opacity: 0,
            y: 20,
            scale: 0.98
        });

        // Animate in
        gsap.to(containerRef.current, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: "power3.out",
            clearProps: "all"
        });
    }, [pathname]);

    return (
        <div ref={containerRef} className="will-change-transform">
            {children}
        </div>
    );
}
