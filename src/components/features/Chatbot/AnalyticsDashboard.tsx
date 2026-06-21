import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, BarChart3, Loader2, AlertTriangle, RefreshCw, Table2, PieChart as PieIcon, Hash, Filter, Users, ExternalLink, Star, TrendingDown, LineChart as LineIcon, Funnel as FunnelIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { AIService, type AnalyticsConfig, type ApplicantRow, type SearchApplicantsResult } from '@/services/AIService';

interface AggregateResponse {
    total?: number;
    hired?: number;
    failed?: number;
    inPipeline?: number;
    metrics?: { passing_rate_pct: number; failure_rate_pct: number; in_pipeline_rate_pct: number };
    groupBy?: string;
    totalGroups?: number;
    groups?: Array<{ group: string; count: number; hired: number; failed: number; inPipeline: number; metrics: { passing_rate_pct: number; failure_rate_pct: number; in_pipeline_rate_pct: number } }>;
}

interface FunnelResponse {
    stages: Array<{ key: string; label: string; count: number; conversionFromTopPct: number; conversionFromPrevPct: number }>;
    topCount: number;
    filters: Record<string, unknown>;
    groupBy?: string;
    groups?: Array<{ key: string; label: string; topCount: number; stages: Array<{ key: string; label: string; count: number; conversionFromTopPct: number; conversionFromPrevPct: number }> }>;
}

type BodyData = AggregateResponse | SearchApplicantsResult | FunnelResponse;

const PIE_COLORS = ['#0078d4', '#1e3a8a', '#0f1941', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#65a30d'];
const BAR_COLOR = '#0078d4';

interface State {
    config: AnalyticsConfig | null;
    loading: boolean;
    error: string | null;
    data: BodyData | null;
}

const ANALYTICS_EVENT = 'ai-open-analytics';

export function AnalyticsDashboard() {
    const [state, setState] = useState<State>({ config: null, loading: false, error: null, data: null });
    const navigate = useNavigate();
    const location = useLocation();

    const close = useCallback(() => {
        setState({ config: null, loading: false, error: null, data: null });
    }, []);

    const trackerInterviewPath = location.pathname.startsWith('/admin/')
        ? '/admin/tracker/interview-form'
        : '/recruiter/tracker/interview-form';

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { config: AnalyticsConfig } | undefined;
            console.log('[AnalyticsDashboard] received event', detail);
            if (detail?.config) {
                setState({ config: detail.config, loading: true, error: null, data: null });
            }
        };
        window.addEventListener(ANALYTICS_EVENT, handler);
        console.log('[AnalyticsDashboard] listener registered for', ANALYTICS_EVENT);
        return () => window.removeEventListener(ANALYTICS_EVENT, handler);
    }, []);

    useEffect(() => {
        if (!state.config || state.data) return;
        const config = state.config;
        setState(prev => ({ ...prev, loading: true, error: null }));
        let fetcher: Promise<unknown>;
        if (config.viz === 'applicant_list') {
            fetcher = AIService.searchApplicants({
                filters: config.filters || {},
                limit: config.limit ?? 50,
                search: config.search ?? null,
                sort_by: config.sort_by ?? null,
            });
        } else if (config.viz === 'funnel') {
            fetcher = AIService.getFunnel({ filters: config.filters || {}, group_by: config.group_by ?? null });
        } else {
            fetcher = AIService.aggregateApplicants(config.filters || {}, config.group_by);
        }
        fetcher
            .then((data: unknown) => {
                setState((prev: State) => ({ ...prev, loading: false, data: data as BodyData }));
            })
            .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : 'Failed to load analysis.';
                setState((prev: State) => ({ ...prev, loading: false, error: message }));
            });
    }, [state.config, state.data]);

    useEffect(() => {
        if (!state.config) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [state.config, close]);

    if (!state.config) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="analytics-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10001] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={close}
            >
                <motion.div
                    key="analytics-panel"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="bg-white rounded-xl shadow-2xl w-[min(960px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden border border-[#edebe9]"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-4 px-5 py-4 bg-gradient-to-r from-[#0f1941] to-[#1e3a8a] text-white">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 size={16} className="shrink-0" />
                                <h2 className="text-[15px] font-semibold tracking-tight truncate">{state.config.title}</h2>
                            </div>
                            {state.config.description && (
                                <p className="text-[11.5px] text-white/75 leading-snug">{state.config.description}</p>
                            )}
                            {Object.keys(state.config.filters).filter(k => state.config!.filters[k]).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {Object.entries(state.config.filters).filter(([, v]) => v).map(([k, v]) => (
                                        <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-white/10 border border-white/20 rounded">
                                            <Filter size={9} />
                                            <span className="font-mono">{k}</span>
                                            <span className="text-white/60">=</span>
                                            <span>{v}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={close}
                            title="Close (Esc)"
                            className="shrink-0 p-1.5 rounded hover:bg-white/10 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 bg-[#faf9f8]">
                        {state.loading && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#0078d4]">
                                <Loader2 size={32} className="animate-spin" />
                                <p className="text-[12px] text-surface-500">Loading analysis…</p>
                            </div>
                        )}
                        {state.error && !state.loading && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                                    <AlertTriangle size={22} className="text-red-500" />
                                </div>
                                <p className="text-[13px] text-red-700">{state.error}</p>
                                <button
                                    onClick={() => setState(prev => ({ ...prev, data: null, error: null }))}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-white border border-red-200 text-red-700 rounded hover:bg-red-50 transition-colors"
                                >
                                    <RefreshCw size={12} /> Retry
                                </button>
                            </div>
                        )}
                        {!state.loading && !state.error && state.data && (
                            <AnalyticsBody
                                config={state.config}
                                data={state.data}
                                onOpenApplicant={(row) => {
                                    if (row.id) {
                                        window.dispatchEvent(new CustomEvent('ai-open-applicant', {
                                            detail: { applicantId: row.id, applicantName: row.name },
                                        }));
                                    }
                                }}
                                onNavigate={(path) => {
                                    close();
                                    navigate(path);
                                }}
                            />
                        )}
                    </div>

                    {state.data && !state.loading && !state.error && (
                        <div className="border-t border-[#edebe9] bg-white px-5 py-2.5 flex items-center justify-between text-[10px] text-surface-500">
                            <div className="flex items-center gap-3">
                                <span>Total: <span className="font-mono font-semibold text-[#201f1e]">
                                    {totalForFooter(state.data)}
                                </span></span>
                                {(state.data as AggregateResponse).totalGroups !== undefined && (
                                    <span>Groups: <span className="font-mono font-semibold text-[#201f1e]">{(state.data as AggregateResponse).totalGroups}</span></span>
                                )}
                                {(state.data as FunnelResponse).stages && (
                                    <span>Stages: <span className="font-mono font-semibold text-[#201f1e]">{(state.data as FunnelResponse).stages.length}</span></span>
                                )}
                            </div>
                            <span>AI-generated dashboard</span>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

function AnalyticsBody({ config, data, onOpenApplicant, onNavigate }: {
    config: AnalyticsConfig;
    data: BodyData;
    onOpenApplicant: (row: ApplicantRow) => void;
    onNavigate: (path: string) => void;
}) {
    if (config.viz === 'kpi') return <KpiView config={config} data={data as AggregateResponse} />;
    if (config.viz === 'table') return <TableView data={data as AggregateResponse} />;
    if (config.viz === 'pie') return <PieView config={config} data={data as AggregateResponse} />;
    if (config.viz === 'line' || config.viz === 'area') return <LineView config={config} data={data as AggregateResponse} />;
    if (config.viz === 'funnel') return <FunnelView data={data as FunnelResponse} />;
    if (config.viz === 'applicant_list') return <ApplicantListView config={config} data={data as SearchApplicantsResult} onOpenApplicant={onOpenApplicant} onNavigate={onNavigate} />;
    return <BarView config={config} data={data as AggregateResponse} />;
}

function metricValue(item: { metrics: AggregateResponse['metrics'] } | AggregateResponse, key: AnalyticsConfig['metric']): number {
    if ('groups' in item && item.groups) return 0;
    const m = (item as AggregateResponse).metrics;
    const total = (item as AggregateResponse).total ?? 0;
    const hired = (item as AggregateResponse).hired ?? 0;
    const failed = (item as AggregateResponse).failed ?? 0;
    const inPipeline = (item as AggregateResponse).inPipeline ?? 0;
    if (!m || total === 0) return 0;
    if (key === 'hired') return hired;
    if (key === 'failed') return failed;
    if (key === 'in_pipeline') return inPipeline;
    if (key === 'total' || key === 'count') return total;
    return m.passing_rate_pct;
}

function metricLabel(key: AnalyticsConfig['metric']): string {
    if (key === 'passing_rate') return 'Passing rate (%)';
    if (key === 'hired') return 'Hired';
    if (key === 'failed') return 'Failed';
    if (key === 'in_pipeline') return 'In pipeline';
    return 'Total';
}

function KpiView({ config, data }: { config: AnalyticsConfig; data: AggregateResponse }) {
    const value = metricValue(data, config.metric);
    const label = metricLabel(config.metric);
    const isPct = config.metric === 'passing_rate';
    return (
        <div className="flex flex-col items-center justify-center py-8">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-surface-400 mb-3">{label}</div>
            <div className="text-[80px] font-black text-[#0f1941] leading-none tabular-nums">
                {value}
                {isPct && <span className="text-[40px] text-[#0078d4]">%</span>}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-md">
                <MiniMetric label="Total" value={data.total ?? 0} color="text-[#0f1941]" />
                <MiniMetric label="Hired" value={data.hired ?? 0} color="text-emerald-600" />
                <MiniMetric label="Failed" value={data.failed ?? 0} color="text-red-600" />
            </div>
        </div>
    );
}

function MiniMetric({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white border border-[#edebe9] rounded-lg px-3 py-2 text-center">
            <div className="text-[9px] font-bold uppercase tracking-widest text-surface-400">{label}</div>
            <div className={cn('text-[20px] font-black tabular-nums', color)}>{value}</div>
        </div>
    );
}

function BarView({ config, data }: { config: AnalyticsConfig; data: AggregateResponse }) {
    const groups = data.groups ?? [];
    if (groups.length === 0) {
        return <EmptyState message="No data matches the selected filters." />;
    }
    const isPct = config.metric === 'passing_rate';
    const chartData = groups.map(g => ({
        name: g.group,
        value: isPct ? g.metrics?.passing_rate_pct ?? 0 : metricValue({ ...g, metrics: g.metrics, total: g.count, hired: g.hired, failed: g.failed, inPipeline: g.inPipeline } as AggregateResponse, config.metric),
        count: g.count,
    }));
    return (
        <div className="space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                <BarChart3 size={11} /> {metricLabel(config.metric)} by {data.groupBy}
            </div>
            <div className="bg-white border border-[#edebe9] rounded-lg p-3" style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#edebe9" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10 }} height={70} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #edebe9' }}
                            formatter={((value: number) => [`${value}${isPct ? '%' : ''}`, metricLabel(config.metric)]) as any}
                            labelFormatter={((_label: string, payload: any) => {
                                const item = payload?.[0]?.payload;
                                return item ? `${item.name} (${item.count} applicants)` : _label;
                            }) as any}
                        />
                        <Bar dataKey="value" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function PieView({ config, data }: { config: AnalyticsConfig; data: AggregateResponse }) {
    const groups = data.groups ?? [];
    if (groups.length === 0) {
        return <EmptyState message="No data matches the selected filters." />;
    }
    const isPct = config.metric === 'passing_rate';
    const chartData = groups.map(g => ({
        name: g.group,
        value: isPct ? g.metrics?.passing_rate_pct ?? 0 : metricValue({ ...g, metrics: g.metrics, total: g.count, hired: g.hired, failed: g.failed, inPipeline: g.inPipeline } as AggregateResponse, config.metric),
        count: g.count,
    }));
    return (
        <div className="space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                <PieIcon size={11} /> {metricLabel(config.metric)} by {data.groupBy}
            </div>
            <div className="bg-white border border-[#edebe9] rounded-lg p-3" style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            label={(d: any) => `${d.name}: ${d.value}${isPct ? '%' : ''}`}
                            labelLine={false}
                        >
                            {chartData.map((_, idx) => (
                                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #edebe9' }}
                            formatter={((value: number) => [`${value}${isPct ? '%' : ''}`, metricLabel(config.metric)]) as any}
                            labelFormatter={((_label: string, payload: any) => {
                                const item = payload?.[0]?.payload;
                                return item ? `${item.name} (${item.count} applicants)` : _label;
                            }) as any}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function LineView({ config, data }: { config: AnalyticsConfig; data: AggregateResponse }) {
    const groups = data.groups ?? [];
    if (groups.length === 0) {
        return <EmptyState message="No data matches the selected filters." />;
    }
    const isArea = config.viz === 'area';
    const isPct = config.metric === 'passing_rate';
    const chartData = groups.map(g => ({
        name: g.group,
        value: isPct ? g.metrics?.passing_rate_pct ?? 0 : metricValue({ ...g, metrics: g.metrics, total: g.count, hired: g.hired, failed: g.failed, inPipeline: g.inPipeline } as AggregateResponse, config.metric),
        count: g.count,
    }));
    const Chart = isArea ? AreaChart : LineChart;
    return (
        <div className="space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                <LineIcon size={11} /> {metricLabel(config.metric)} by {data.groupBy} ({isArea ? 'area' : 'line'})
            </div>
            <div className="bg-white border border-[#edebe9] rounded-lg p-3" style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <Chart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#edebe9" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10 }} height={70} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #edebe9' }}
                            formatter={((value: number) => [`${value}${isPct ? '%' : ''}`, metricLabel(config.metric)]) as any}
                            labelFormatter={((_label: string, payload: any) => {
                                const item = payload?.[0]?.payload;
                                return item ? `${item.name} (${item.count} applicants)` : _label;
                            }) as any}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {isArea ? (
                            <Area type="monotone" dataKey="value" stroke={BAR_COLOR} fill={BAR_COLOR} fillOpacity={0.2} strokeWidth={2} />
                        ) : (
                            <Line type="monotone" dataKey="value" stroke={BAR_COLOR} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        )}
                    </Chart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function FunnelStageRow({ stage, idx, maxCount, prevCount }: {
    stage: { key: string; label: string; count: number; conversionFromTopPct: number; conversionFromPrevPct: number };
    idx: number;
    maxCount: number;
    prevCount: number;
}) {
    const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
    const dropped = idx > 0 ? prevCount - stage.count : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-[12px] gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0f1941] text-white text-[10px] font-bold shrink-0">{idx + 1}</span>
                    <span className="font-semibold text-[#201f1e] truncate">{stage.label}</span>
                </div>
                <div className="flex items-center gap-3 text-right tabular-nums shrink-0">
                    <span className={`font-bold text-[14px] ${stage.count === 0 ? 'text-surface-400' : 'text-[#0078d4]'}`}>
                        {stage.count.toLocaleString()}
                    </span>
                    <span className="text-[10.5px] text-surface-500 w-20">
                        {stage.conversionFromTopPct}% of top
                    </span>
                    {idx > 0 && (
                        <span className={cn(
                            "text-[10.5px] font-semibold w-16",
                            stage.count === 0 ? "text-surface-400" :
                            stage.conversionFromPrevPct >= 50 ? "text-emerald-600" :
                            stage.conversionFromPrevPct >= 20 ? "text-amber-600" : "text-red-600"
                        )}>
                            {dropped > 0 ? '↓ ' : ''}{stage.conversionFromPrevPct}%
                        </span>
                    )}
                </div>
            </div>
            <div className="relative h-9 bg-surface-100 rounded overflow-hidden">
                {stage.count > 0 ? (
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0078d4] to-[#1e3a8a] transition-all"
                        style={{ width: `${Math.max(widthPct, 4)}%` }}
                    />
                ) : (
                    <div className="absolute inset-y-0 left-0 right-0 flex items-center pl-2 text-[10px] text-surface-400 italic">
                        none reached this stage
                    </div>
                )}
                {dropped > 0 && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 text-[10px] text-surface-500">
                        <TrendingDown size={11} className="mr-1" />
                        dropped {dropped.toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
}

function SingleFunnel({ stages, topCount, accent }: {
    stages: Array<{ key: string; label: string; count: number; conversionFromTopPct: number; conversionFromPrevPct: number }>;
    topCount: number;
    accent?: string;
}) {
    const maxCount = topCount || 1;
    return (
        <div className="space-y-2">
            {stages.map((stage, idx) => (
                <FunnelStageRow
                    key={stage.key}
                    stage={stage}
                    idx={idx}
                    maxCount={maxCount}
                    prevCount={idx > 0 ? stages[idx - 1].count : topCount}
                />
            ))}
            <div className={`${accent || 'bg-[#0f1941]'} text-white rounded-lg p-4 flex items-center justify-between mt-3`}>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Overall conversion</p>
                    <p className="text-[18px] font-bold mt-0.5">
                        {stages[stages.length - 1]?.conversionFromTopPct ?? 0}%
                        <span className="text-[12px] font-normal text-white/70 ml-2">Applied → Hired</span>
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Hired</p>
                    <p className="text-[22px] font-black tabular-nums">{stages[stages.length - 1]?.count ?? 0}</p>
                </div>
            </div>
        </div>
    );
}

function FunnelView({ data }: { data: FunnelResponse }) {
    const stages = data.stages ?? [];
    const groups = data.groups ?? [];
    const isGrouped = groups.length > 0;

    if (!isGrouped && (stages.length === 0 || data.topCount === 0)) {
        return <EmptyState message="No applicants match the selected filters — nothing to funnel-ize." />;
    }
    if (isGrouped && data.topCount === 0) {
        return <EmptyState message={`No applicants found for any ${data.groupBy || 'group'} — nothing to funnel-ize.`} />;
    }

    return (
        <div className="space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                <FunnelIcon size={11} />
                {isGrouped
                    ? `Pipeline funnel by ${data.groupBy} — ${groups.length} group${groups.length === 1 ? '' : 's'}, ${data.topCount.toLocaleString()} total applicants at top`
                    : `Pipeline funnel — ${stages.length} stages, ${data.topCount.toLocaleString()} applicants at top`
                }
            </div>
            {isGrouped ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {groups.map((g) => (
                        <div key={g.key} className="bg-surface-50 border border-surface-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#0078d4] text-white text-[10px] font-bold shrink-0">
                                        <Users size={12} />
                                    </span>
                                    <span className="font-bold text-[#0f1941] truncate" title={g.label}>{g.label}</span>
                                </div>
                                <span className="text-[10px] text-surface-500 tabular-nums shrink-0">
                                    {g.topCount.toLocaleString()} at top
                                </span>
                            </div>
                            {g.topCount === 0 ? (
                                <p className="text-[11px] text-surface-400 italic py-3 text-center">No applicants in this group</p>
                            ) : (
                                <SingleFunnel stages={g.stages} topCount={g.topCount} accent="bg-[#0f1941]" />
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <SingleFunnel stages={stages} topCount={data.topCount} />
            )}
        </div>
    );
}

function TableView({ data }: { data: AggregateResponse }) {
    const groups = data.groups ?? [];
    if (groups.length === 0) {
        return <EmptyState message="No data matches the selected filters." />;
    }
    return (
        <div className="space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                <Table2 size={11} /> {data.groupBy ? `Breakdown by ${data.groupBy}` : 'Aggregate'}
            </div>
            <div className="bg-white border border-[#edebe9] rounded-lg overflow-hidden">
                <table className="w-full text-[12px]">
                    <thead>
                        <tr className="bg-[#f3f2f1] text-left">
                            <th className="px-3 py-2 font-semibold">Group</th>
                            <th className="px-3 py-2 font-semibold text-right">Total</th>
                            <th className="px-3 py-2 font-semibold text-right">Hired</th>
                            <th className="px-3 py-2 font-semibold text-right">Failed</th>
                            <th className="px-3 py-2 font-semibold text-right">In pipeline</th>
                            <th className="px-3 py-2 font-semibold text-right">Pass rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map((g, i) => (
                            <tr key={i} className="border-t border-[#edebe9] hover:bg-[#faf9f8]">
                                <td className="px-3 py-2 font-medium">{g.group}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{g.count}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{g.hired}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-red-700">{g.failed}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-[#0078d4]">{g.inPipeline}</td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold">{g.metrics?.passing_rate_pct ?? 0}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-surface-500">
            <Hash size={28} className="text-surface-300" />
            <p className="text-[12.5px]">{message}</p>
        </div>
    );
}

function statusColor(status: string | null | undefined): string {
    const s = (status || '').toUpperCase();
    if (s === 'HIRED' || s.includes('PASSED') || s.includes('PASS')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'REJECTED' || s === 'FAILED' || s.includes('FAIL')) return 'bg-red-50 text-red-700 border-red-200';
    if (s.includes('INTERVIEW') || s.includes('ASSESSMENT') || s.includes('PIPELINE') || s === 'APPLIED' || s === 'QUEUE_ASSIGNED') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'WITHDRAWN' || s === 'NOT_ELIGIBLE_FOR_REHIRE') return 'bg-surface-100 text-surface-600 border-surface-200';
    return 'bg-surface-100 text-surface-700 border-surface-200';
}

type ColumnDef = {
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    width?: string;
    render: (a: ApplicantRow) => React.ReactNode;
};

const APPLICANT_COLUMNS: Record<string, ColumnDef> = {
    name: {
        key: 'name', label: 'Name', align: 'left', width: 'min-w-[160px]',
        render: (a) => (
            <>
                <div className="truncate max-w-[180px] font-medium">{a.name || '—'}</div>
                {a.email && <div className="text-[10px] text-surface-400 truncate max-w-[180px]">{a.email}</div>}
            </>
        ),
    },
    position: {
        key: 'position', label: 'Position', align: 'left', width: 'min-w-[140px]',
        render: (a) => (
            <>
                <div className="truncate max-w-[160px]">{a.position || '—'}</div>
                {a.department && <div className="text-[10px] text-surface-400 truncate max-w-[160px]">{a.department}</div>}
            </>
        ),
    },
    status: {
        key: 'status', label: 'Status', align: 'left',
        render: (a) => (
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded border ${statusColor(a.currentStatus)}`}>
                {a.currentStatus || '—'}
            </span>
        ),
    },
    school: {
        key: 'school', label: 'School', align: 'left', width: 'min-w-[140px]',
        render: (a) => (
            <>
                <div className="truncate max-w-[160px]">{a.school || '—'}</div>
                {a.course && <div className="text-[10px] text-surface-400 truncate max-w-[160px]">{a.course}</div>}
            </>
        ),
    },
    education: {
        key: 'education', label: 'Education', align: 'left',
        render: (a) => (
            <div className="truncate max-w-[140px]">{a.highestEducation || '—'}</div>
        ),
    },
    course: {
        key: 'course', label: 'Course', align: 'left',
        render: (a) => (
            <div className="truncate max-w-[140px]">{a.course || '—'}</div>
        ),
    },
    department: {
        key: 'department', label: 'Department', align: 'left',
        render: (a) => (
            <div className="truncate max-w-[140px]">{a.department || '—'}</div>
        ),
    },
    gender: {
        key: 'gender', label: 'Gender', align: 'left',
        render: (a) => (
            <div className="text-[11px]">{a.gender || '—'}</div>
        ),
    },
    rating: {
        key: 'rating', label: 'Rating', align: 'right',
        render: (a) => (
            a.personalRating != null ? (
                <span className="inline-flex items-center gap-0.5 text-amber-600 font-semibold tabular-nums">
                    <Star size={10} className="fill-amber-500 stroke-amber-600" />
                    {Number(a.personalRating).toFixed(1)}
                </span>
            ) : <span className="text-surface-300">—</span>
        ),
    },
    score: {
        key: 'score', label: 'Score', align: 'right',
        render: (a) => (
            a.assessmentScore != null
                ? <span className="font-semibold tabular-nums">{a.assessmentScore}</span>
                : <span className="text-surface-300">—</span>
        ),
    },
    wpm: {
        key: 'wpm', label: 'WPM', align: 'right',
        render: (a) => (
            a.typingTestWpm != null
                ? <span className="font-bold text-[#0078d4] tabular-nums">{a.typingTestWpm}<span className="text-[9px] text-surface-500 font-normal ml-0.5">wpm</span></span>
                : <span className="text-surface-300">—</span>
        ),
    },
    accuracy: {
        key: 'accuracy', label: 'Accuracy', align: 'right',
        render: (a) => (
            a.typingTestAccuracy != null
                ? <span className="font-semibold tabular-nums">{a.typingTestAccuracy}<span className="text-[9px] text-surface-500 font-normal ml-0.5">%</span></span>
                : <span className="text-surface-300">—</span>
        ),
    },
    applied: {
        key: 'applied', label: 'Applied', align: 'right',
        render: (a) => (
            <span className="text-surface-500 text-[10.5px] tabular-nums">
                {a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : '—'}
            </span>
        ),
    },
    hired: {
        key: 'hired', label: 'Hired', align: 'right',
        render: (a) => (
            a.hiredAt
                ? <span className="text-emerald-700 text-[10.5px] tabular-nums">{new Date(a.hiredAt).toLocaleDateString()}</span>
                : <span className="text-surface-300">—</span>
        ),
    },
};

const DEFAULT_COLUMNS: string[] = ['name', 'position', 'status', 'school', 'rating', 'score', 'applied'];

function ApplicantListView({ data, config, onOpenApplicant, onNavigate }: {
    data: SearchApplicantsResult;
    config: AnalyticsConfig;
    onOpenApplicant: (row: ApplicantRow) => void;
    onNavigate: (path: string) => void;
}) {
    const location = useLocation();
    const interviewPath = location.pathname.startsWith('/admin/')
        ? '/admin/tracker/interview-form'
        : '/recruiter/tracker/interview-form';
    const applicants = data.applicants ?? [];
    const requestedColumns = config.columns && config.columns.length > 0 ? config.columns : DEFAULT_COLUMNS;
    const columns = requestedColumns
        .map(k => APPLICANT_COLUMNS[k])
        .filter((c): c is ColumnDef => Boolean(c));
    const displayColumns = columns.length > 0 ? columns : DEFAULT_COLUMNS.map(k => APPLICANT_COLUMNS[k]);
    if (applicants.length === 0) {
        return <EmptyState message="No candidates match the selected filters." />;
    }
    const sortLabel = data.sortBy ? data.sortBy.replace(/_/g, ' ').replace('desc', '↓').replace('asc', '↑').replace('  ', ' ') : null;
    return (
        <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5 flex-wrap">
                <Users size={11} />
                <span>{applicants.length} candidate{applicants.length === 1 ? '' : 's'}</span>
                {sortLabel && (
                    <span className="font-mono text-[9.5px] text-[#0078d4] bg-[#0078d4]/10 px-1.5 py-0.5 rounded normal-case">
                        sorted by {sortLabel}
                    </span>
                )}
            </div>
            <div className="bg-white border border-[#edebe9] rounded-lg overflow-hidden">
                <div className="max-h-[480px] overflow-y-auto">
                    <table className="w-full text-[12px]">
                        <thead className="sticky top-0 bg-[#f3f2f1] z-10">
                            <tr className="text-left">
                                {displayColumns.map(c => (
                                    <th key={c.key} className={cn('px-3 py-2 font-semibold', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center')}>
                                        {c.label}
                                    </th>
                                ))}
                                <th className="px-3 py-2 w-8" />
                            </tr>
                        </thead>
                        <tbody>
                            {applicants.map((a, i) => (
                                <tr
                                    key={a.id || i}
                                    onClick={() => onOpenApplicant(a)}
                                    className="border-t border-[#edebe9] hover:bg-[#faf9f8] cursor-pointer transition-colors group"
                                    title="Click to open applicant profile"
                                >
                                    {displayColumns.map(c => (
                                        <td key={c.key} className={cn('px-3 py-2', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center')}>
                                            {c.render(a)}
                                        </td>
                                    ))}
                                    <td className="px-3 py-2 text-surface-300 group-hover:text-[#0078d4]">
                                        <ExternalLink size={12} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <button
                onClick={() => onNavigate(interviewPath)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11.5px] font-semibold bg-white border border-[#edebe9] hover:border-[#0078d4] hover:text-[#0078d4] text-surface-600 rounded transition-colors"
            >
                <ExternalLink size={11} /> Open interview form
            </button>
        </div>
    );
}

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

function totalForFooter(data: BodyData): number {
    if ('total' in data && typeof (data as AggregateResponse).total === 'number') {
        return (data as AggregateResponse).total as number;
    }
    const groups = (data as AggregateResponse).groups;
    if (Array.isArray(groups)) {
        return groups.reduce((sum: number, g: { count: number }) => sum + g.count, 0);
    }
    if ('topCount' in data && typeof (data as FunnelResponse).topCount === 'number') {
        return (data as FunnelResponse).topCount;
    }
    if ('total' in data && typeof (data as SearchApplicantsResult).total === 'number') {
        return (data as SearchApplicantsResult).total;
    }
    return 0;
}
