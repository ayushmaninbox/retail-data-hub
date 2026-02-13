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
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple/30 to-accent-teal/30 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            
            <div className="glass-card relative p-6 border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-teal/10 flex items-center justify-center border border-accent-purple/20">
                            <Brain className="w-5 h-5 text-accent-purple" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Executive Summary</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Retail Data Hub Intelligence</p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isAI 
                        ? "bg-accent-purple/10 text-accent-purple border border-accent-purple/20" 
                        : "bg-slate-800 text-slate-400 border border-white/5"
                    }`}>
                        <Sparkles className={`w-3 h-3 ${isAI ? "animate-pulse" : ""}`} />
                        {isAI ? "AI Generated Insights" : "System Insights"}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {insights.map((insight: string, idx: number) => (
                        <div key={idx} className="flex gap-3 items-start p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors group/item">
                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-accent-purple shrink-0 group-hover/item:scale-125 transition-transform" />
                            <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                {insight}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
