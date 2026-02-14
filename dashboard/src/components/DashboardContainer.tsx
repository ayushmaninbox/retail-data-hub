"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ScrollReset from "@/components/ScrollReset";
import { Menu } from "lucide-react";

export default function DashboardContainer({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-surface-200">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-[60]">
                <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-white tracking-tight">Retail Hub</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </header>

            {/* Sidebar Backdrop (Mobile) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] lg:hidden animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 lg:ml-64 min-h-screen relative z-10 p-4 pt-20 lg:pt-4 transition-all duration-300">
                <ScrollReset />
                <div id="main-scroll-container" className="h-[calc(100vh-5rem)] lg:h-[calc(100vh-2rem)] bg-surface-100 rounded-[1.5rem] lg:rounded-[2.5rem] shadow-sm border border-slate-200 overflow-y-auto">
                    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">{children}</div>
                </div>
            </main>
        </div>
    );
}
