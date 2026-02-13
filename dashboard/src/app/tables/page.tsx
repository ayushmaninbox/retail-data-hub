"use client";

import { useState, useEffect, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    Database,
    Table2,
    Star,
    Box,
    Layers,
    Download,
    ChevronDown,
    ChevronUp,
    ArrowUp,
    Key,
    Link2,
    Hash,
    Type,
    Calendar,
    ToggleLeft,
    Search,
    FileJson,
    FileSpreadsheet,
    ArrowRight,
    Activity,
    Eye,
    X,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ChartCard from "@/components/ChartCard";

/* ── Helpers ── */

const LAYER_META: Record<string, { label: string; color: string; gradient: string; description: string }> = {
    bronze: {
        label: "Bronze",
        color: "#cd7f32",
        gradient: "from-orange-700/20 to-amber-900/10",
        description: "Raw ingested data — untransformed, as received from source systems",
    },
    silver: {
        label: "Silver",
        color: "#94a3b8",
        gradient: "from-slate-400/20 to-slate-600/10",
        description: "Cleaned & validated data — deduped, quality-checked, enriched",
    },
    gold: {
        label: "Gold",
        color: "#eab308",
        gradient: "from-yellow-500/20 to-amber-500/10",
        description: "Star-schema analytics layer — fact & dimension tables for dashboards",
    },
};

const DTYPE_ICONS: Record<string, any> = {
    int64: Hash,
    int32: Hash,
    float64: Hash,
    object: Type,
    "datetime64[ns]": Calendar,
    bool: ToggleLeft,
};

const SECTIONS = [
    { id: "gold", label: "Gold Layer", icon: Star },
    { id: "silver", label: "Silver Layer", icon: Layers },
    { id: "bronze", label: "Bronze Layer", icon: Box },
];

const API_BASE = "http://localhost:8000";

function fmtNum(n: number | undefined | null): string {
    return (n ?? 0).toLocaleString("en-IN");
}

/* ── Table Preview Component ── */

function TablePreview({
    table,
    layer,
    onClose,
    onNavigate,
}: {
    table: any;
    layer: string;
    onClose: () => void;
    onNavigate?: (tableName: string) => void;
}) {
    const [dlFormat, setDlFormat] = useState<"csv" | "json">("csv");
    const cols = table.column_info || [];
    const rows = table.sample_rows || [];

    const handleDownload = () => {
        const url = `${API_BASE}/api/tables/download/${layer}/${table.name}?format=${dlFormat}`;
        window.open(url, "_blank");
    };

    return (
        <div className="animate-slide-up">
            <ChartCard
                title={`📋 ${table.name}`}
                subtitle={`${table.description} · ${fmtNum(table.rows)} rows × ${table.columns} columns · Format: ${table.format}`}
                action={
                    <div className="flex items-center gap-2">
                        {/* Download format picker */}
                        <div className="flex rounded-lg overflow-hidden border border-white/10">
                            <button
                                onClick={() => setDlFormat("csv")}
                                className={`px-3 py-1.5 text-[10px] font-semibold uppercase flex items-center gap-1 transition-all ${dlFormat === "csv"
                                        ? "bg-accent-teal/20 text-accent-teal"
                                        : "text-slate-500 hover:text-white"
                                    }`}
                            >
                                <FileSpreadsheet className="w-3 h-3" /> CSV
                            </button>
                            <button
                                onClick={() => setDlFormat("json")}
                                className={`px-3 py-1.5 text-[10px] font-semibold uppercase flex items-center gap-1 transition-all ${dlFormat === "json"
                                        ? "bg-accent-purple/20 text-accent-purple"
                                        : "text-slate-500 hover:text-white"
                                    }`}
                            >
                                <FileJson className="w-3 h-3" /> JSON
                            </button>
                        </div>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30 transition-all"
                        >
                            <Download className="w-3 h-3" /> Download
                        </button>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                }
            >
                {/* Column schema */}
                <div className="mb-4">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2 tracking-wider">Schema</p>
                    <div className="flex flex-wrap gap-1.5">
                        {cols.map((col: any, i: number) => {
                            const DIcon = DTYPE_ICONS[col.dtype] || Type;
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] border transition-all ${col.is_pk
                                            ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                                            : col.fk_to
                                                ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                                                : "border-white/[0.06] bg-white/[0.02] text-slate-300"
                                        }`}
                                >
                                    {col.is_pk ? <Key className="w-3 h-3 text-yellow-400" /> : col.fk_to ? <Link2 className="w-3 h-3 text-blue-400" /> : <DIcon className="w-3 h-3 text-slate-500" />}
                                    <span className="font-medium">{col.name}</span>
                                    <span className="text-slate-500">{col.dtype}</span>
                                    {col.fk_to && (
                                        <button
                                            onClick={() => onNavigate?.(col.fk_to)}
                                            className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                                            title={`Jump to ${col.fk_to}`}
                                        >
                                            <ArrowRight className="w-3 h-3" />
                                            <span>{col.fk_to}</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Column stats */}
                <div className="mb-4">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2 tracking-wider">Column Stats</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                        {cols.slice(0, 8).map((col: any, i: number) => (
                            <div key={i} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                <p className="text-[10px] font-medium text-white truncate mb-1">{col.name}</p>
                                <div className="text-[10px] text-slate-400 space-y-0.5">
                                    <p>Unique: <span className="text-white">{fmtNum(col.unique)}</span></p>
                                    <p>Nulls: <span className={col.null_count > 0 ? "text-amber-400" : "text-emerald-400"}>{col.null_count}</span></p>
                                    {col.min !== undefined && (
                                        <p>Range: <span className="text-white">{typeof col.min === "number" ? fmtNum(col.min) : col.min}</span> – <span className="text-white">{typeof col.max === "number" ? fmtNum(col.max) : col.max}</span></p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Data preview table */}
                <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2 tracking-wider">
                        Preview (first {rows.length} rows)
                    </p>
                    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                        <table className="w-full text-xs">
                            <thead>
                                <tr style={{ background: "rgba(139,92,246,0.06)" }}>
                                    {cols.map((col: any, i: number) => (
                                        <th
                                            key={i}
                                            className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-white/[0.06]"
                                        >
                                            <div className="flex items-center gap-1">
                                                {col.is_pk && <Key className="w-3 h-3 text-yellow-400" />}
                                                {col.fk_to && <Link2 className="w-3 h-3 text-blue-400" />}
                                                {col.name}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row: any, ri: number) => (
                                    <tr
                                        key={ri}
                                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                                    >
                                        {cols.map((col: any, ci: number) => {
                                            const val = row[col.name];
                                            const display = val === null || val === undefined ? "—" : String(val);
                                            return (
                                                <td
                                                    key={ci}
                                                    className={`px-3 py-2 whitespace-nowrap ${val === null ? "text-slate-600 italic" : "text-slate-300"
                                                        }`}
                                                    title={display}
                                                >
                                                    {display.length > 30 ? display.slice(0, 30) + "…" : display}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </ChartCard>
        </div>
    );
}

/* ── Main Page ── */

export default function DataTablesPage() {
    const { data, loading } = useApi<any>("/api/tables");
    const [activeSection, setActiveSection] = useState("gold");
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [selectedTable, setSelectedTable] = useState<{ layer: string; name: string } | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setShowScrollTop(scrollY > 400);
            for (let i = SECTIONS.length - 1; i >= 0; i--) {
                const el = document.getElementById(SECTIONS[i].id);
                if (el && el.offsetTop - 100 <= scrollY) {
                    setActiveSection(SECTIONS[i].id);
                    break;
                }
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (loading || !data) return <PageSkeleton />;

    // Search filter
    const filterTables = (tables: any[]) => {
        if (!search) return tables;
        const q = search.toLowerCase();
        return tables.filter(
            (t: any) =>
                t.name.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                (t.column_info || []).some((c: any) => c.name.toLowerCase().includes(q))
        );
    };

    // Get the currently selected table data
    const getSelectedTableData = () => {
        if (!selectedTable) return null;
        const layerTables = data[selectedTable.layer] || [];
        return layerTables.find((t: any) => t.name === selectedTable.name);
    };

    const selectedTableData = getSelectedTableData();

    // Navigate to a linked table (FK click)
    const handleNavigate = (tableName: string) => {
        // Find which layer has this table
        for (const layer of ["gold", "silver", "bronze"]) {
            const found = (data[layer] || []).find((t: any) => t.name === tableName);
            if (found) {
                setSelectedTable({ layer, name: tableName });
                // Scroll to preview
                setTimeout(() => {
                    document.getElementById("table-preview")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
                return;
            }
        }
    };

    // Total counts
    const totalTables = Object.values(data).reduce((s: number, layer: any) => s + (layer as any[]).length, 0);
    const totalRows = Object.values(data).reduce(
        (s: number, layer: any) => s + (layer as any[]).reduce((ss: number, t: any) => ss + t.rows, 0),
        0
    );

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Database}
                title="Data Tables Explorer"
                subtitle={`Explore all ${totalTables} tables across Bronze → Silver → Gold pipeline · ${fmtNum(totalRows)} total rows`}
            />

            {/* ── Sticky Nav ── */}
            <nav className="sticky top-0 z-40 -mx-8 px-8 py-3" style={{ background: "rgba(10,10,25,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                        {SECTIONS.map((s) => {
                            const SIcon = s.icon;
                            const isActive = activeSection === s.id;
                            return (
                                <a
                                    key={s.id}
                                    href={`#${s.id}`}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${isActive
                                            ? "bg-accent-purple/20 text-accent-purple shadow-sm shadow-accent-purple/10"
                                            : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                                        }`}
                                >
                                    <SIcon className="w-3.5 h-3.5" />
                                    {s.label}
                                </a>
                            );
                        })}
                    </div>
                    <div className="flex-1" />
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tables..."
                            className="pl-9 pr-3 py-2 rounded-lg text-xs bg-white/[0.04] border border-white/[0.06] text-white placeholder-slate-500 focus:outline-none focus:border-accent-purple/40 w-48 transition-all"
                        />
                    </div>
                </div>
            </nav>

            {/* ── Layer Sections ── */}
            {(["gold", "silver", "bronze"] as const).map((layer) => {
                const meta = LAYER_META[layer];
                const tables = filterTables(data[layer] || []);
                if (tables.length === 0 && search) return null;

                return (
                    <div key={layer} id={layer} className="animate-slide-up">
                        {/* Layer header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: `${meta.color}20` }}
                            >
                                {layer === "gold" ? (
                                    <Star className="w-4 h-4" style={{ color: meta.color }} />
                                ) : layer === "silver" ? (
                                    <Layers className="w-4 h-4" style={{ color: meta.color }} />
                                ) : (
                                    <Box className="w-4 h-4" style={{ color: meta.color }} />
                                )}
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white">{meta.label} Layer</h2>
                                <p className="text-[10px] text-slate-500">{meta.description}</p>
                            </div>
                            <span className="ml-auto text-xs text-slate-500">{tables.length} tables</span>
                        </div>

                        {/* Table cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {tables.map((tbl: any) => {
                                const isSelected = selectedTable?.layer === layer && selectedTable?.name === tbl.name;
                                const isFact = tbl.table_type === "fact";
                                const isDim = tbl.table_type === "dimension";

                                return (
                                    <button
                                        key={tbl.name}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedTable(null);
                                            } else {
                                                setSelectedTable({ layer, name: tbl.name });
                                                setTimeout(() => {
                                                    document.getElementById("table-preview")?.scrollIntoView({ behavior: "smooth" });
                                                }, 100);
                                            }
                                        }}
                                        className={`p-4 rounded-xl text-left transition-all hover:scale-[1.01] ${isSelected
                                                ? "ring-2 ring-accent-purple/50 bg-accent-purple/[0.06]"
                                                : "hover:bg-white/[0.03]"
                                            }`}
                                        style={{
                                            background: isSelected
                                                ? undefined
                                                : `linear-gradient(135deg, ${meta.color}08, ${meta.color}03)`,
                                            border: `1px solid ${isSelected ? "rgba(139,92,246,0.3)" : meta.color + "20"}`,
                                        }}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {isFact ? (
                                                    <Star className="w-4 h-4 text-yellow-400" />
                                                ) : isDim ? (
                                                    <Link2 className="w-4 h-4 text-blue-400" />
                                                ) : (
                                                    <Table2 className="w-4 h-4" style={{ color: meta.color }} />
                                                )}
                                                <span className="text-sm font-semibold text-white">{tbl.name}</span>
                                            </div>
                                            {(isFact || isDim) && (
                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${isFact ? "text-yellow-400 bg-yellow-400/15" : "text-blue-400 bg-blue-400/15"
                                                    }`}>
                                                    {tbl.table_type}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 mb-3">{tbl.description}</p>
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-lg font-bold text-white">{fmtNum(tbl.rows)}</p>
                                                <p className="text-[10px] text-slate-500">rows</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-white">{tbl.columns}</p>
                                                <p className="text-[10px] text-slate-500">columns</p>
                                            </div>
                                            <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
                                                <Eye className="w-3 h-3" />
                                                Preview
                                            </div>
                                        </div>

                                        {/* FK links for fact table */}
                                        {isFact && tbl.fk_links && (
                                            <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                                <p className="text-[10px] text-slate-500 mb-1.5">Links to dimensions:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.entries(tbl.fk_links).map(([fk, dim]: [string, any]) => (
                                                        <span
                                                            key={fk}
                                                            className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                        >
                                                            {fk} → {dim}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* PK for dimension tables */}
                                        {isDim && tbl.pk && (
                                            <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                                    PK: {tbl.pk}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* ── Table Preview Panel ── */}
            {selectedTableData && (
                <div id="table-preview">
                    <TablePreview
                        table={selectedTableData}
                        layer={selectedTable!.layer}
                        onClose={() => setSelectedTable(null)}
                        onNavigate={handleNavigate}
                    />
                </div>
            )}

            {/* ── Scroll to Top ── */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className={`fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-accent-purple/90 text-white flex items-center justify-center shadow-lg shadow-accent-purple/30 transition-all duration-300 hover:bg-accent-purple hover:scale-110 ${showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                    }`}
            >
                <ArrowUp className="w-4 h-4" />
            </button>
        </div>
    );
}
