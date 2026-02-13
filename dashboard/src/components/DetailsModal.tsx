"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface DetailRow {
    label: string;
    value: string;
    subValue?: string;
    color?: string;
    percentage?: number;
}

interface DetailsModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    icon?: LucideIcon;
    accentColor?: string;
    rows: DetailRow[];
    footer?: string;
}

export default function DetailsModal({
    open,
    onClose,
    title,
    icon: Icon,
    accentColor = "from-accent-purple to-accent-blue",
    rows,
    footer,
}: DetailsModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    /* Animate open */
    useEffect(() => {
        if (open) {
            setVisible(true);
            // trigger animation on next frame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setAnimateIn(true));
            });
        } else {
            setAnimateIn(false);
            const timer = setTimeout(() => setVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [open]);

    /* Close on Escape */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (open) window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!visible) return null;

    return (
        <div
            ref={overlayRef}
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
                background: animateIn ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0)",
                backdropFilter: animateIn ? "blur(6px)" : "blur(0px)",
                transition: "background 0.3s ease, backdrop-filter 0.3s ease",
            }}
        >
            <div
                className="relative w-full max-w-lg mx-4 flex flex-col"
                style={{
                    maxHeight: "85vh",
                    background: "rgba(255,255,255,0.97)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "20px",
                    boxShadow:
                        "0 24px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
                    opacity: animateIn ? 1 : 0,
                    transform: animateIn
                        ? "translateY(0) scale(1)"
                        : "translateY(24px) scale(0.96)",
                    transition:
                        "opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1)",
                }}
            >
                {/* Header — fixed */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-black/[0.06] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div
                                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentColor} flex items-center justify-center opacity-90`}
                            >
                                <Icon className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="p-6 space-y-3 overflow-y-auto flex-1 min-h-0">
                    {rows.map((row, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-4 rounded-xl transition-all hover:bg-black/[0.02]"
                            style={{
                                background: "rgba(0,0,0,0.015)",
                                border: "1px solid rgba(0,0,0,0.05)",
                                opacity: animateIn ? 1 : 0,
                                transform: animateIn
                                    ? "translateY(0)"
                                    : "translateY(12px)",
                                transition: `opacity 0.35s cubic-bezier(0.16,1,0.3,1) ${0.05 + i * 0.04}s, transform 0.35s cubic-bezier(0.16,1,0.3,1) ${0.05 + i * 0.04}s`,
                            }}
                        >
                            <div className="flex items-center gap-3">
                                {row.color && (
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ background: row.color }}
                                    />
                                )}
                                <div>
                                    <p className="text-sm font-medium text-slate-800">
                                        {row.label}
                                    </p>
                                    {row.subValue && (
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {row.subValue}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">{row.value}</p>
                                {row.percentage !== undefined && (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {row.percentage.toFixed(1)}%
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Percentage bar */}
                    {rows.length > 0 && rows.some((r) => r.percentage !== undefined) && (
                        <div
                            className="mt-4 h-2.5 rounded-full overflow-hidden flex"
                            style={{ background: "rgba(0,0,0,0.05)" }}
                        >
                            {rows
                                .filter((r) => r.percentage !== undefined)
                                .map((r, i) => (
                                    <div
                                        key={i}
                                        className="h-full"
                                        style={{
                                            width: animateIn ? `${r.percentage}%` : "0%",
                                            background: r.color || "#7c3aed",
                                            transition: `width 0.6s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
                                        }}
                                    />
                                ))}
                        </div>
                    )}
                </div>

                {/* Footer — fixed */}
                {footer && (
                    <div className="px-6 pb-5 pt-2 border-t border-black/[0.04] flex-shrink-0">
                        <p className="text-xs text-slate-400 text-center">{footer}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
