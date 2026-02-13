"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Background() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const orbs = containerRef.current.querySelectorAll(".orb");

        orbs.forEach((orb) => {
            // Random movement
            const moveOrb = () => {
                gsap.to(orb, {
                    x: Math.random() * window.innerWidth - window.innerWidth / 2,
                    y: Math.random() * window.innerHeight - window.innerHeight / 2,
                    duration: 15 + Math.random() * 15, // 15-30s duration
                    ease: "sine.inOut",
                    onComplete: moveOrb,
                });
            };

            // Random scale pulse
            gsap.to(orb, {
                scale: 1.2 + Math.random() * 0.5,
                duration: 8 + Math.random() * 8,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
            });

            moveOrb();
        });

        return () => {
            gsap.killTweensOf(orbs);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
            style={{ background: "#f8f9fc" }} // Fallback light bg
        >
            {/* Main gradient blobs */}
            <div
                className="orb absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full blur-[100px] opacity-40 mix-blend-multiply"
                style={{ background: "#e0e7ff" }} // indigo-100
            />
            <div
                className="orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px] opacity-40 mix-blend-multiply"
                style={{ background: "#f3e8ff" }} // purple-100
            />
            <div
                className="orb absolute bottom-1/4 right-1/4 w-[550px] h-[550px] rounded-full blur-[100px] opacity-40 mix-blend-multiply"
                style={{ background: "#dbeafe" }} // blue-100
            />
            <div
                className="orb absolute top-3/4 left-1/3 w-[400px] h-[400px] rounded-full blur-[80px] opacity-30 mix-blend-multiply"
                style={{ background: "#ccfbf1" }} // teal-100
            />
        </div>
    );
}
