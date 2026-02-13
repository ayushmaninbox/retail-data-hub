"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/Skeleton";
import {
    Database,
    Table2,
    Star,
    Box,
    Layers,
    Download,
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    Key,
    Link2,
    Search,
    FileJson,
    FileSpreadsheet,
    ArrowRight,
    Eye,
    X,
    Hash,
    Type,
    Calendar,
    ToggleLeft,
    ChevronsLeft,
    ChevronsRight,
    Loader2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

/* ── Constants ── */

const API_BASE = "http://localhost:8000";

const LAYER_META: Record<string, { label: string; color: string; icon: any; description: string }> = {
    gold: {
        label: "Gold",
        color: "#eab308",
        icon: Star,
        description: "Star-schema analytics layer — fact & dimension tables",
    },
    silver: {
        label: "Silver",
        color: "#94a3b8",
        icon: Link2,
        description: "Cleaned & validated data — deduped, quality-checked",
    },
    bronze: {
        label: "Bronze",
        color: "#cd7f32",
        icon: Download,
        description: "Raw ingested data — untransformed, as received",
    },
};

const DTYPE_ICONS: Record<string, any> = {
    int64: Hash, int32: Hash, float64: Hash,
    object: Type, "datetime64[ns]": Calendar, bool: ToggleLeft,
};

function fmtNum(n: number | undefined | null): string {
    return (n ?? 0).toLocaleString("en-IN");
}

/* ── Paginated Table Viewer ── */

function PaginatedTable({
    layer,
    tableName,
    columns,
    onNavigate,
}: {
    layer: string;
    tableName: string;
    columns: any[];
    onNavigate: (name: string) => void;
}) {
    const [page, setPage] = useState(1);
    const [pageData, setPageData] = useState<any>(null);
    const [loadingRows, setLoadingRows] = useState(false);

    const fetchPage = useCallback(async (p: number) => {
        setLoadingRows(true);
        try {
            const res = await fetch(`${API_BASE}/api/tables/rows/${layer}/${tableName}?page=${p}&page_size=20`);
            const data = await res.json();
            setPageData(data);
            setPage(p);
        } catch {
            setPageData(null);
        }
        setLoadingRows(false);
    }, [layer, tableName]);

    useEffect(() => {
        fetchPage(1);
    }, [fetchPage]);

    if (!pageData) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-accent-purple animate-spin" />
            </div>
        );
    }

    const rows = pageData.rows || [];
    const totalPages = pageData.total_pages || 1;
    const totalRows = pageData.total_rows || 0;
    const startRow = (page - 1) * 20 + 1;
    const endRow = Math.min(page * 20, totalRows);

    return (
        <div>
            {/* Data grid */}
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                <table className="w-full text-xs">
                    <thead>
                        <tr style={{ background: "rgba(139,92,246,0.08)" }}>
                            <th className="text-center px-2 py-2.5 text-[10px] font-semibold text-slate-500 border-b border-black/[0.06] w-12">#</th>
                            {columns.map((col: any, i: number) => (
                                <th
                                    key={i}
                                    className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-black/[0.06]"
                                >
                                    <div className="flex items-center gap-1">
                                        {col.is_pk && <Key className="w-3 h-3 text-yellow-400" />}
                                        {col.fk_to && (
                                            <button onClick={() => onNavigate(col.fk_to)} title={`Jump to ${col.fk_to}`}>
                                                <Link2 className="w-3 h-3 text-blue-400 hover:text-blue-300" />
                                            </button>
                                        )}
                                        {col.name}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={loadingRows ? "opacity-40 transition-opacity" : "transition-opacity"}>
                        {rows.map((row: any, ri: number) => (
                            <tr key={ri} className="border-b border-black/[0.04] hover:bg-black/[0.02] transition-colors">
                                <td className="text-center px-2 py-2 text-[10px] text-slate-600 font-mono">{startRow + ri}</td>
                                {columns.map((col: any, ci: number) => {
                                    const val = row[col.name];
                                    const display = val === null || val === undefined ? "—" : String(val);
                                    return (
                                        <td
                                            key={ci}
                                            className={`px-3 py-2 whitespace-nowrap font-mono text-[11px] ${val === null ? "text-slate-600 italic" : "text-slate-300"
                                                }`}
                                            title={display}
                                        >
                                            {display.length > 35 ? display.slice(0, 35) + "…" : display}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-xs text-slate-500">
                    Showing <span className="text-slate-800 font-semibold">{fmtNum(startRow)}</span> – <span className="text-slate-800 font-semibold">{fmtNum(endRow)}</span> of <span className="text-slate-800 font-semibold">{fmtNum(totalRows)}</span> rows
                </p>

                <div className="flex items-center gap-1">
                    {/* First */}
                    <button
                        onClick={() => fetchPage(1)}
                        disabled={page <= 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="First page"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>
                    {/* Prev */}
                    <button
                        onClick={() => fetchPage(page - 1)}
                        disabled={page <= 1}
                        className="px-3 h-8 rounded-lg flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-800 hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>

                    {/* Page numbers */}
                    {(() => {
                        const pages: number[] = [];
                        const start = Math.max(1, page - 2);
                        const end = Math.min(totalPages, page + 2);
                        for (let i = start; i <= end; i++) pages.push(i);
                        return pages.map((p) => (
                            <button
                                key={p}
                                onClick={() => fetchPage(p)}
                                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${p === page
                                    ? "bg-accent-purple/25 text-accent-purple"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-black/[0.04]"
                                    }`}
                            >
                                {p}
                            </button>
                        ));
                    })()}

                    {/* Next */}
                    <button
                        onClick={() => fetchPage(page + 1)}
                        disabled={page >= totalPages}
                        className="px-3 h-8 rounded-lg flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-800 hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {/* Last */}
                    <button
                        onClick={() => fetchPage(totalPages)}
                        disabled={page >= totalPages}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Last page"
                    >
                        <ChevronsRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Main Page ── */

export default function DataTablesPage() {
    const { data, loading } = useApi<any>("/api/tables");
    const [selectedTable, setSelectedTable] = useState<{ layer: string; name: string } | null>(null);
    const [search, setSearch] = useState("");
    const [dlFormat, setDlFormat] = useState<"csv" | "json">("csv");
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (loading || !data) return <PageSkeleton />;

    const filterTables = (tables: any[]) => {
        if (!search) return tables;
        const q = search.toLowerCase();
        return tables.filter(
            (t: any) =>
                t.name.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q)
        );
    };

    const getSelectedTableMeta = () => {
        if (!selectedTable) return null;
        return (data[selectedTable.layer] || []).find((t: any) => t.name === selectedTable.name);
    };

    const selectedMeta = getSelectedTableMeta();

    const handleSelect = (layer: string, name: string) => {
        if (selectedTable?.layer === layer && selectedTable?.name === name) {
            setSelectedTable(null);
        } else {
            setSelectedTable({ layer, name });
            setTimeout(() => {
                document.getElementById("table-viewer")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
    };

    const handleNavigate = (tableName: string) => {
        for (const layer of ["gold", "silver", "bronze"]) {
            const found = (data[layer] || []).find((t: any) => t.name === tableName);
            if (found) {
                handleSelect(layer, tableName);
                return;
            }
        }
    };

    const handleDownload = () => {
        if (!selectedTable) return;
        window.open(`${API_BASE}/api/tables/download/${selectedTable.layer}/${selectedTable.name}?format=${dlFormat}`, "_blank");
    };

    // Total counts
    const totalTables = Object.values(data).reduce((s: number, l: any) => s + (l as any[]).length, 0);
    const totalRows = Object.values(data).reduce((s: number, l: any) => s + (l as any[]).reduce((ss: number, t: any) => ss + t.rows, 0), 0);

    return (
        <div className="space-y-8">
            <PageHeader
                icon={Database}
                title="Data Tables Explorer"
                subtitle={`${totalTables} tables across Bronze → Silver → Gold · ${fmtNum(totalRows)} total rows`}
            />

            {/* Search bar */}
            <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tables by name or description..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-black/[0.02] border border-black/[0.06] text-slate-800 placeholder-slate-500 focus:outline-none focus:border-accent-purple/40 transition-all"
                />
            </div>

            {/* ── Layer Sections ── */}
            {(["gold", "silver", "bronze"] as const).map((layer) => {
                const meta = LAYER_META[layer];
                const tables = filterTables(data[layer] || []);
                if (tables.length === 0 && search) return null;

                return (
                    <section key={layer} id={layer}>
                        {/* Layer header */}
                        <div className="flex items-center gap-3 mb-4">
                            <meta.icon className="w-5 h-5" style={{ color: meta.color }} />
                            <div>
                                <h2 className="text-base font-bold text-slate-800">{meta.label} Layer</h2>
                                <p className="text-xs text-slate-500">{meta.description}</p>
                            </div>
                            <span className="ml-auto text-xs text-slate-600 font-mono">{tables.length} tables</span>
                        </div>

                        {/* Table list — clean horizontal cards */}
                        <div className="space-y-2">
                            {tables.map((tbl: any) => {
                                const isSelected = selectedTable?.layer === layer && selectedTable?.name === tbl.name;
                                const isFact = tbl.table_type === "fact";
                                const isDim = tbl.table_type === "dimension";

                                return (
                                    <button
                                        key={tbl.name}
                                        onClick={() => handleSelect(layer, tbl.name)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all ${isSelected
                                            ? "bg-accent-purple/[0.08] ring-1 ring-accent-purple/40"
                                            : "bg-black/[0.02] hover:bg-black/[0.04]"
                                            }`}
                                        style={{ border: `1px solid ${isSelected ? "rgba(139,92,246,0.3)" : "rgba(0,0,0,0.04)"}` }}
                                    >
                                        {/* Icon */}
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: `${meta.color}15` }}
                                        >
                                            {isFact ? <Star className="w-5 h-5 text-yellow-400" /> :
                                                isDim ? <Link2 className="w-5 h-5 text-blue-400" /> :
                                                    <Table2 className="w-5 h-5" style={{ color: meta.color }} />}
                                        </div>

                                        {/* Name + description */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-800">{tbl.name}</span>
                                                {(isFact || isDim) && (
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isFact ? "text-yellow-400 bg-yellow-400/15" : "text-blue-400 bg-blue-400/15"
                                                        }`}>
                                                        {tbl.table_type}
                                                    </span>
                                                )}
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/[0.04] text-slate-500 font-mono">{tbl.format}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{tbl.description}</p>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-6 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-800">{fmtNum(tbl.rows)}</p>
                                                <p className="text-[10px] text-slate-500">rows</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-800">{tbl.columns}</p>
                                                <p className="text-[10px] text-slate-500">cols</p>
                                            </div>
                                            {tbl.pk && (
                                                <span className="text-[10px] px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/15 font-mono whitespace-nowrap">
                                                    PK: {tbl.pk}
                                                </span>
                                            )}
                                            {tbl.fk_links && (
                                                <div className="flex gap-1">
                                                    {Object.values(tbl.fk_links).map((dim: any) => (
                                                        <span key={dim} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/15 font-mono">
                                                            → {dim}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <Eye className={`w-4 h-4 ${isSelected ? "text-accent-purple" : "text-slate-600"}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                );
            })}

            {/* ═══════════════════════════════════════════════════════
                TABLE VIEWER PANEL
               ═══════════════════════════════════════════════════════ */}
            {selectedMeta && (
                <div id="table-viewer" className="glass-card-static p-6 animate-slide-up">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Database className="w-4 h-4 text-accent-purple" />
                                <h3 className="text-base font-bold text-slate-800">
                                    {(() => {
                                        const Icon = LAYER_META[selectedTable!.layer].icon;
                                        return <Icon className="w-5 h-5 inline-block mr-2 align-text-bottom" style={{ color: LAYER_META[selectedTable!.layer].color }} />;
                                    })()} {selectedMeta.name}
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-purple/15 text-accent-purple font-semibold uppercase">
                                    {LAYER_META[selectedTable!.layer].label}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">{selectedMeta.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Download controls */}
                            <div className="flex rounded-lg overflow-hidden border border-black/10">
                                <button
                                    onClick={() => setDlFormat("csv")}
                                    className={`px-3 py-1.5 text-[10px] font-semibold uppercase flex items-center gap-1 transition-all ${dlFormat === "csv" ? "bg-accent-teal/20 text-accent-teal" : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    <FileSpreadsheet className="w-3 h-3" /> CSV
                                </button>
                                <button
                                    onClick={() => setDlFormat("json")}
                                    className={`px-3 py-1.5 text-[10px] font-semibold uppercase flex items-center gap-1 transition-all ${dlFormat === "json" ? "bg-accent-purple/20 text-accent-purple" : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    <FileJson className="w-3 h-3" /> JSON
                                </button>
                            </div>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30 transition-all"
                            >
                                <Download className="w-3 h-3" /> Download All
                            </button>
                            <button
                                onClick={() => setSelectedTable(null)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-black/[0.04] transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Schema overview - columns as a compact row */}
                    <div className="mb-5">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2 tracking-wider">Columns ({selectedMeta.columns})</p>
                        <div className="flex flex-wrap gap-1.5">
                            {(selectedMeta.column_info || []).map((col: any, i: number) => {
                                const DIcon = DTYPE_ICONS[col.dtype] || Type;
                                return (
                                    <span
                                        key={i}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono ${col.is_pk
                                            ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"
                                            : col.fk_to
                                                ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                                                : "bg-black/[0.03] text-slate-400 border border-black/[0.05]"
                                            }`}
                                    >
                                        {col.is_pk ? <Key className="w-2.5 h-2.5" /> : col.fk_to ? <Link2 className="w-2.5 h-2.5" /> : <DIcon className="w-2.5 h-2.5 opacity-50" />}
                                        {col.name}
                                        <span className="text-slate-600">{col.dtype.replace("64", "").replace("32", "")}</span>
                                        {col.fk_to && (
                                            <button
                                                onClick={() => handleNavigate(col.fk_to)}
                                                className="text-blue-400 hover:text-blue-200"
                                                title={`Open ${col.fk_to}`}
                                            >
                                                <ArrowRight className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Paginated table */}
                    <PaginatedTable
                        layer={selectedTable!.layer}
                        tableName={selectedTable!.name}
                        columns={selectedMeta.column_info || []}
                        onNavigate={handleNavigate}
                    />
                </div>
            )}

            {/* Scroll to Top */}
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
