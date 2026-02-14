"use client";

import { Sparkles, Brain, AlertCircle } from "lucide-react";
import { useApi } from "@/hooks/useApi";

export default function ExecutiveSummary() {
    const { data, loading, error } = useApi<any>("/api/summary");

    if (loading) {
        return (
            <div className="glass-card p-6 animate-pulse border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5" />
                    <div className="h-4 w-32 bg-white/5 rounded" />
                </div>
                <div className="space-y-3">
                    <div className="h-3 w-full bg-white/5 rounded" />
                    <div className="h-3 w-3/4 bg-white/5 rounded" />
                    <div className="h-3 w-1/2 bg-white/5 rounded" />
                </div>
            </div>
        );
    }

    if (error || !data || !data.insights) {
        return null; // Don't show if there's an error or no data
    }

    const { insights, source } = data;
    const isAI = source === "gemini_pro" || source === "gemini_pro_vision";

    return (
        <div className="relative group animate-slide-up">
            {/* Background Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple/50 to-accent-teal/50 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>

            <div className="relative p-8 rounded-2xl border border-white/10 shadow-2xl bg-[#0f172a]/80 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-purple/30 to-accent-teal/20 flex items-center justify-center border border-accent-purple/30 shadow-lg shadow-accent-purple/10">
                            <Brain className="w-6 h-6 text-accent-purple" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Executive Summary</h2>
                            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mt-1">Retail Data Hub Intelligence</p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg ${isAI
                            ? "bg-accent-purple/20 text-accent-purple border border-accent-purple/30 shadow-accent-purple/20"
                            : "bg-slate-800 text-slate-400 border border-white/10"
                        }`}>
                        <Sparkles className={`w-3.5 h-3.5 ${isAI ? "animate-pulse" : ""}`} />
                        {isAI ? "AI Generated Insights" : "System Insights"}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {insights.map((insight: string, idx: number) => (
                        <div key={idx} className="relative flex gap-4 items-start p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-accent-purple/30 transition-all duration-300 group/item hover:-translate-y-0.5 hover:shadow-lg">
                            <div className="mt-2 w-2.5 h-2.5 rounded-full bg-accent-purple shrink-0 group-hover/item:scale-150 group-hover/item:shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300" />
                            <p className="text-base text-slate-200 leading-relaxed font-semibold">
                                {insight}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
