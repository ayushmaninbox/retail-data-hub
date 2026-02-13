"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function CustomCursor() {
    const cursorRef = useRef<HTMLDivElement>(null);
    const followerRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const cursor = cursorRef.current;
        const follower = followerRef.current;

        if (!cursor || !follower) return;

        const moveCursor = (e: MouseEvent) => {
            gsap.to(cursor, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.1,
                ease: "power2.out"
            });

            gsap.to(follower, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.6,
                ease: "power3.out"
            });
        };

        const handleHoverStart = () => setIsHovering(true);
        const handleHoverEnd = () => setIsHovering(false);

        window.addEventListener("mousemove", moveCursor);

        // Add hover listeners to clickable elements
        const clickables = document.querySelectorAll('a, button, input, [role="button"]');
        clickables.forEach(el => {
            el.addEventListener("mouseenter", handleHoverStart);
            el.addEventListener("mouseleave", handleHoverEnd);
        });

        return () => {
            window.removeEventListener("mousemove", moveCursor);
            clickables.forEach(el => {
                el.removeEventListener("mouseenter", handleHoverStart);
                el.removeEventListener("mouseleave", handleHoverEnd);
            });
        };
    }, []);

    useEffect(() => {
        if (!cursorRef.current || !followerRef.current) return;

        const size = isHovering ? 60 : 20; // Follower size

        gsap.to(followerRef.current, {
            width: size,
            height: size,
            backgroundColor: isHovering ? "rgba(124, 58, 237, 0.1)" : "rgba(148, 163, 184, 0.2)",
            borderColor: isHovering ? "rgba(124, 58, 237, 0.3)" : "transparent",
            borderWidth: isHovering ? 1 : 0,
            duration: 0.3,
            ease: "back.out(1.7)"
        });

        gsap.to(cursorRef.current, {
            scale: isHovering ? 0 : 1, // Hide dot on hover for cleaner look
            duration: 0.2
        });

    }, [isHovering]);

    return (
        <>
            {/* Main pointer dot */}
            <div
                ref={cursorRef}
                className="fixed top-0 left-0 w-2 h-2 bg-slate-800 rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 hidden md:block"
            />
            {/* Smooth follower circle */}
            <div
                ref={followerRef}
                className="fixed top-0 left-0 w-5 h-5 rounded-full pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 hidden md:block backdrop-blur-[1px]"
                style={{ background: "rgba(148, 163, 184, 0.2)" }}
            />
        </>
    );
}
