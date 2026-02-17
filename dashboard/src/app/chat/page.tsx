"use client";

import { useState, useRef, useEffect } from "react";
import {
    Send,
    Bot,
    User,
    Sparkles,
    BarChart3,
    Table as TableIcon,
    ChevronRight,
    Loader2,
    Database,
    Brain,
    Cpu,
    TrendingUp,
    ShoppingBag,
    AlertTriangle,
    Search
} from "lucide-react";
import { API_BASE } from "@/config";
import PageHeader from "@/components/PageHeader";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────

type DataType = "text" | "table" | "chart";

interface ChatMessage {
    role: "user" | "assistant";
    text: string;
    data_type?: DataType;
    data?: any;
    timestamp: Date;
}

// ── Constants ──────────────────────────────────────────────────────

const SUGGESTIONS = [
    { label: "Predict Revenue", text: "What is the 30-day forecast?", icon: <TrendingUp className="w-3 h-3 text-green-400" /> },
    { label: "Market Basket", text: "What products are bought together?", icon: <ShoppingBag className="w-3 h-3 text-orange-400" /> },
    { label: "Tech Stack", text: "How is the data pipeline built?", icon: <Cpu className="w-3 h-3 text-blue-400" /> },
    { label: "Inventory Risk", text: "Identify stockout risks.", icon: <AlertTriangle className="w-3 h-3 text-red-400" /> },
    { label: "Customer Segments", text: "Analyze CLV segments.", icon: <User className="w-3 h-3 text-purple-400" /> },
];

const GREETINGS = [
    "Hello! I am synchronized with the Retail Hub's Gold layer. I can analyze revenue growth, ML forecasts, or our Medallion architecture.",
    "Ready for deep analysis. I have full context on Sales trends, Inventory health, and the Parquet storage layer.",
    "Intelligence link active. Ask me about our DuckDB-powered analytics or specific market basket associations.",
];

// ── Components ──────────────────────────────────────────────────────

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.role === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            {/* Content */}
            <div className={`${!isUser && message.data ? "max-w-full" : "max-w-[85%]"} space-y-4 ${isUser ? "text-right" : "text-left"} flex-1`}>
                <div className={`inline-block p-4 rounded-2xl border relative group transition-all ${isUser
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                    : "bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
                    }`}>
                    {!isUser && (
                        <div className="absolute -top-2.5 -right-2 flex gap-1 opacity-100">
                            <span className="text-[9px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-md shadow-sm border border-white/20">GEMINI 2.0</span>
                            <span className="text-[9px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-sm border border-white/20">MCP-PROTOCOL</span>
                        </div>
                    )}
                    <div className={`text-[15px] leading-relaxed prose prose-sm max-w-none ${isUser ? "prose-invert" : "prose-slate"}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.text}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Data Rendering */}
                {!isUser && message.data && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        {message.data_type === "table" && <ThemedTable data={message.data} />}
                        {message.data_type === "chart" && <DynamicChart config={message.data} />}
                    </div>
                )}
            </div>
        </div>
    );
};

const ThemedTable = ({ data }: { data: any }) => {
    if (!data || !data.headers || !data.rows) return null;

    return (
        <div className="glass-card-static overflow-hidden border border-white/10 shadow-2xl w-full">
            <div className="max-h-[400px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-100 sticky top-0 z-20 border-b border-slate-200">
                        <tr>
                            {data.headers.map((h: string, i: number) => (
                                <th key={i} className="px-4 py-3 font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.rows.map((row: any[], i: number) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors bg-white">
                                {row.map((cell: any, j: number) => (
                                    <td key={j} className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DynamicChart = ({ config }: { config: any }) => {
    if (!config || !config.data) return null;

    const COLORS = ["#8b5cf6", "#14b8a6", "#3b82f6", "#ec4899", "#f59e0b"];

    return (
        <div className="glass-card-static p-4 lg:p-6 border border-white/10 h-64 sm:h-80">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-accent-purple" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    {config.type} Analysis
                </span>
            </div>

            <ResponsiveContainer width="100%" height="85%">
                {config.type === "pie" ? (
                    <PieChart>
                        <Pie
                            data={config.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {config.data.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                ) : config.type === "area" ? (
                    <AreaChart data={config.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf620" />
                    </AreaChart>
                ) : (
                    <BarChart data={config.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};

// ── Main Page ──────────────────────────────────────────────────────

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [thoughtLog, setThoughtLog] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (smooth = true) => {
        if (!messagesEndRef.current) return;
        messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    };

    useEffect(() => {
        if (messages.length > 1 || isLoading) {
            scrollToBottom();
        }
    }, [messages, isLoading]);

    useEffect(() => {
        // Dynamic greeting
        const hour = new Date().getHours();
        const greeting = hour < 12 ? "Good morning! Ready for some deep retail intelligence?" :
            hour < 18 ? "Good afternoon! The Retail Hub Brain is synchronized." :
                "Good evening! Analyzing the day's final telemetry.";

        setMessages([{
            role: "assistant",
            text: `${greeting} I have full technical and operational context of the platform. Ask me anything about our Star Schema, Forecasting models, or Commercial trends.`,
            timestamp: new Date()
        }]);
    }, []);

    const handleSend = async (customInput?: string) => {
        const query = customInput || input;
        if (!query.trim() || isLoading) return;

        const userMsg: ChatMessage = {
            role: "user",
            text: query,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);
        setThoughtLog(["Initializing Query Context...", "Accessing Medallion Gold Layer...", "Consulting Retail Knowledge Base..."]);

        try {
            // Simulate intelligence steps for UX
            const steps = [
                "Querying DuckDB OLAP Engine...",
                "Running Multi-Model Inference...",
                "Generating Consultative Insights..."
            ];

            for (const step of steps) {
                await new Promise(r => setTimeout(r, 600));
                setThoughtLog(prev => [...prev, step]);
            }

            const response = await fetch(`${API_BASE}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: query, history: [] })
            });

            if (!response.ok) throw new Error("API failed");

            const data = await response.json();

            const assistantMsg: ChatMessage = {
                role: "assistant",
                text: data.text,
                data_type: data.data_type,
                data: data.data,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: "assistant",
                text: "⚠️ System error in our high-latency link. Check your API connectivity.",
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
            setThoughtLog([]);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] lg:h-[calc(100vh-2rem)] space-y-3 lg:space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between glass-card p-3 lg:p-4">
                <div className="flex items-center gap-2 lg:gap-3">
                    <div className="p-1.5 lg:p-2 bg-accent-purple/10 rounded-xl">
                        <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-accent-purple" />
                    </div>
                    <div>
                        <h1 className="text-base lg:text-lg font-bold text-slate-900 uppercase tracking-tight">Retail Hub Brain</h1>
                        <p className="text-[9px] text-slate-500 font-semibold font-mono flex items-center gap-1 uppercase tracking-tighter">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Synchronized
                        </p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 glass-card p-3 lg:p-4 overflow-y-auto space-y-4 lg:space-y-6 custom-scrollbar scroll-smooth">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                        <Database className="w-12 h-12 text-slate-500" />
                        <p className="text-sm">The Retail Hub's memory is ready.</p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                ))}

                {isLoading && (
                    <div className="flex justify-start space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl w-full max-w-sm shadow-2xl">
                            <div className="flex items-center gap-3 mb-3">
                                <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
                                <span className="text-[11px] font-bold text-white uppercase tracking-widest">MCP Agent Logs</span>
                            </div>
                            <div className="space-y-1.5">
                                {thoughtLog.map((step, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-300 font-mono animate-in fade-in slide-in-from-left-2">
                                        <ChevronRight className="w-3 h-3 text-emerald-500" />
                                        {step}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none px-4">
                {SUGGESTIONS.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => handleSend(s.text)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 whitespace-nowrap text-xs text-slate-800 font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 rounded-lg shadow-sm uppercase tracking-tighter"
                    >
                        {s.icon}
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="glass-card p-4">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-4"
                >
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Analyze strategy or data..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 text-xs lg:text-sm text-slate-900 font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple/50 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl transition-all shadow-lg shadow-indigo-700/20 flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline font-bold">Send</span>
                    </button>
                </form>
                <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><Brain className="w-3 h-3 text-accent-purple" /> Dynamic Model</span>
                    <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Gold Layer Verified</span>
                </div>
            </div>
        </div>
    );
}
