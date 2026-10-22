import React from 'react';
import { socketService } from '@/services/socketService';
import { apiClient } from '@/utils/apiClient';
import { 
    Activity, Users, ShieldAlert, Monitor, LogOut, 
    RefreshCw, Cpu, Database, Eye, Terminal 
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

interface AllMindOversightProps {
    tab: string;
}

interface TrafficEntry {
    method: string;
    url: string;
    status: number;
    duration: number;
    ip: string;
    userId: string | null;
    userName: string | null;
    timestamp: string;
}

interface LoginAuditEntry {
    id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    user_id: string;
    user_name: string | null;
    user_role: string | null;
    ip_address: string;
    user_agent: string;
    created_at: string;
}

interface ActiveSessionEntry {
    socketId: string;
    id: string;
    email: string;
    full_name: string;
    role: string;
    department: string | null;
    page: string;
    lastSeen: number;
    activity: string | null;
}

export function AllMindOversight({ tab }: AllMindOversightProps) {
    const [traffic, setTraffic] = React.useState<TrafficEntry[]>([]);
    const [sessions, setSessions] = React.useState<ActiveSessionEntry[]>([]);
    const [logins, setLogins] = React.useState<LoginAuditEntry[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [uptime, setUptime] = React.useState(0);

    const socket = React.useMemo(() => socketService.getSocket(), []);

    // Fetch traffic
    const fetchTraffic = React.useCallback(() => {
        socket.emit('allmind:get-traffic', (data: TrafficEntry[]) => {
            // Sort by timestamp desc
            const sorted = [...data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setTraffic(sorted);
        });
    }, [socket]);

    // Fetch active sessions
    const fetchSessions = React.useCallback(() => {
        socket.emit('allmind:get-sessions', (data: ActiveSessionEntry[]) => {
            setSessions(data);
        });
    }, [socket]);

    // Fetch login audit logs
    const fetchLogins = React.useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiClient.get<LoginAuditEntry[]>('/audit/logins');
            setLogins(response.data || []);
        } catch (error) {
            console.error('[AllMindOversight] Failed to fetch login audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Force Logout handler
    const handleForceLogout = (targetSocketId: string) => {
        socket.emit('allmind:force-logout', targetSocketId, (res: { success: boolean; error?: string }) => {
            if (res.success) {
                fetchSessions();
            } else {
                alert(`Failed to terminate session: ${res.error || 'unknown error'}`);
            }
        });
    };

    // Global poll intervals
    React.useEffect(() => {
        if (tab === 'login_audit') {
            fetchLogins();
        }
    }, [tab, fetchLogins]);

    const pollData = React.useCallback(() => {
        fetchTraffic();
        fetchSessions();
    }, [fetchTraffic, fetchSessions]);

    useVisibilityPolling(pollData, 5000, [pollData]);

    React.useEffect(() => {
        const uptimeInterval = setInterval(() => {
            setUptime(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(uptimeInterval);
        };
    }, []);

    // Format duration in uptime string
    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    // ── RENDER COMMAND CENTER ──────────────────────────────────────────
    if (tab === 'command_center') {
        const recentErrorsCount = traffic.filter(t => t.status >= 400).length;
        const totalRequests = traffic.length;

        return (
            <div className="space-y-6 font-mono text-emerald-400">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="bg-black/40 border border-emerald-500/20 p-4 rounded-none shadow-[0_0_15px_rgba(16,185,129,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Users size={48} />
                        </div>
                        <p className="text-[10px] text-emerald-600 uppercase tracking-widest">Active Neural Nodes</p>
                        <p className="text-3xl font-bold mt-2 text-emerald-300">{sessions.length}</p>
                        <p className="text-[9px] text-emerald-700 mt-2">Socket-level connections online</p>
                    </div>

                    <div className="bg-black/40 border border-emerald-500/20 p-4 rounded-none shadow-[0_0_15px_rgba(16,185,129,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Activity size={48} />
                        </div>
                        <p className="text-[10px] text-emerald-600 uppercase tracking-widest">Network Throughput</p>
                        <p className="text-3xl font-bold mt-2 text-emerald-300">{totalRequests}</p>
                        <p className="text-[9px] text-emerald-700 mt-2">HTTP buffer request load</p>
                    </div>

                    <div className="bg-black/40 border border-emerald-500/20 p-4 rounded-none shadow-[0_0_15px_rgba(16,185,129,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <ShieldAlert size={48} />
                        </div>
                        <p className="text-[10px] text-emerald-600 uppercase tracking-widest">Abnormal Requests</p>
                        <p className={cn("text-3xl font-bold mt-2", recentErrorsCount > 0 ? "text-rose-400 animate-pulse" : "text-emerald-300")}>
                            {recentErrorsCount}
                        </p>
                        <p className="text-[9px] text-emerald-700 mt-2">HTTP statuses &ge; 400</p>
                    </div>

                    <div className="bg-black/40 border border-emerald-500/20 p-4 rounded-none shadow-[0_0_15px_rgba(16,185,129,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Cpu size={48} />
                        </div>
                        <p className="text-[10px] text-emerald-600 uppercase tracking-widest">Matrix Uptime</p>
                        <p className="text-3xl font-bold mt-2 text-emerald-300">{formatUptime(uptime)}</p>
                        <p className="text-[9px] text-emerald-700 mt-2">Console activity tracking duration</p>
                    </div>
                </div>

                {/* System Diagnostics */}
                <div className="bg-black/40 border border-emerald-500/20 rounded-none p-5 shadow-[0_0_20px_rgba(16,185,129,0.02)]">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-400">System Telemetry Output</h3>
                    </div>
                    <div className="bg-black/80 rounded-none p-4 h-64 overflow-y-auto text-[11px] leading-relaxed text-emerald-500/90 custom-scrollbar border border-emerald-950 font-mono">
                        <p className="text-emerald-700">[{new Date().toISOString()}] ALLMIND Core interface initialized...</p>
                        <p className="text-emerald-700">[{new Date().toISOString()}] Connection pool established with PostgreSQL-18</p>
                        <p className="text-emerald-700">[{new Date().toISOString()}] Port 4447 socket streams bind: OK</p>
                        {sessions.map((s, idx) => (
                            <p key={s.socketId + idx}>
                                &gt; Node connected: {s.full_name} ({s.role.replace('_', ' ').toUpperCase()}) @ {s.page} [SID: {s.socketId.substring(0, 8)}...]
                            </p>
                        ))}
                        {traffic.slice(0, 6).map((t, idx) => (
                            <p key={idx} className="text-emerald-600/70">
                                &gt; Stream trace: {t.method} {t.url} - {t.status} ({t.duration}ms) from {t.ip}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── RENDER TRAFFIC MONITOR ─────────────────────────────────────────
    if (tab === 'traffic') {
        return (
            <div className="space-y-4 font-mono text-emerald-400">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-500">Live Traffic Ring Buffer</h3>
                    <button 
                        onClick={fetchTraffic}
                        className="flex items-center gap-1 text-[10px] bg-neutral-900 border border-emerald-500/20 hover:border-emerald-500 px-2.5 py-1 text-emerald-500 rounded-none transition-all"
                    >
                        <RefreshCw size={10} className="animate-spin-slow" />
                        Refresh Buffer
                    </button>
                </div>

                <div className="bg-black border border-emerald-500/20 rounded-none overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                    <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-[11px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-emerald-500/20 bg-emerald-950/20 text-emerald-600 uppercase text-[9px] tracking-wider select-none">
                                    <th className="p-3">Method</th>
                                    <th className="p-3">URI / Destination</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-right">Duration</th>
                                    <th className="p-3">Operator</th>
                                    <th className="p-3">Origin IP</th>
                                    <th className="p-3 text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-950/30">
                                {traffic.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-emerald-800">
                                            No stream activity detected in ring buffer
                                        </td>
                                    </tr>
                                ) : (
                                    traffic.map((t, idx) => (
                                        <tr key={idx} className="hover:bg-emerald-950/10 transition-colors">
                                            <td className="p-3 font-bold">
                                                <span className={cn(
                                                    t.method === 'GET' && 'text-emerald-400',
                                                    t.method === 'POST' && 'text-cyan-400',
                                                    t.method === 'PUT' && 'text-amber-400',
                                                    t.method === 'DELETE' && 'text-rose-400'
                                                )}>
                                                    {t.method}
                                                </span>
                                            </td>
                                            <td className="p-3 max-w-[200px] truncate text-emerald-500/90" title={t.url}>
                                                {t.url}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded-none text-[10px] font-semibold",
                                                    t.status < 300 ? "bg-emerald-950/60 text-emerald-400" :
                                                    t.status < 400 ? "bg-cyan-950/60 text-cyan-400" : "bg-rose-950/60 text-rose-400"
                                                )}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right text-emerald-600 font-bold tabular-nums">
                                                {t.duration}ms
                                            </td>
                                            <td className="p-3 truncate max-w-[120px] text-emerald-500/80">
                                                {t.userName || <span className="text-emerald-800">anonymous</span>}
                                            </td>
                                            <td className="p-3 text-emerald-700 tabular-nums">
                                                {t.ip.replace('::ffff:', '')}
                                            </td>
                                            <td className="p-3 text-right text-emerald-800 tabular-nums">
                                                {new Date(t.timestamp).toLocaleTimeString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // ── RENDER LOGIN AUDIT ─────────────────────────────────────────────
    if (tab === 'login_audit') {
        return (
            <div className="space-y-4 font-mono text-emerald-400">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-500">Identity Audit Records</h3>
                    <button 
                        onClick={fetchLogins}
                        disabled={loading}
                        className="flex items-center gap-1 text-[10px] bg-neutral-900 border border-emerald-500/20 hover:border-emerald-500 px-2.5 py-1 text-emerald-500 rounded-none transition-all disabled:opacity-40"
                    >
                        <RefreshCw size={10} className={cn(loading && "animate-spin")} />
                        Refresh Audit Logs
                    </button>
                </div>

                <div className="bg-black border border-emerald-500/20 rounded-none overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                    <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-[11px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-emerald-500/20 bg-emerald-950/20 text-emerald-600 uppercase text-[9px] tracking-wider select-none">
                                    <th className="p-3">Timestamp</th>
                                    <th className="p-3">Operator</th>
                                    <th className="p-3">Assigned Role</th>
                                    <th className="p-3">Action Type</th>
                                    <th className="p-3">IP Address</th>
                                    <th className="p-3">User Agent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-950/30">
                                {loading && logins.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-emerald-500">
                                            Scanning audit database...
                                        </td>
                                    </tr>
                                ) : logins.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-emerald-800">
                                            No recent authorization attempts recorded
                                        </td>
                                    </tr>
                                ) : (
                                    logins.map((log) => {
                                        const isSuccess = log.action === 'auth.login';
                                        return (
                                            <tr key={log.id} className="hover:bg-emerald-950/10 transition-colors">
                                                <td className="p-3 text-emerald-600 tabular-nums">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </td>
                                                <td className="p-3 font-semibold text-emerald-400">
                                                    {log.user_name || <span className="text-rose-500">Unregistered Identity</span>}
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-1.5 py-0.5 rounded-none bg-emerald-950 border border-emerald-900 text-emerald-500 text-[10px]">
                                                        {log.user_role ? log.user_role.toUpperCase() : 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-bold">
                                                    <span className={cn(
                                                        isSuccess ? "text-emerald-400" : "text-rose-400"
                                                    )}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-emerald-700 tabular-nums">
                                                    {log.ip_address.replace('::ffff:', '')}
                                                </td>
                                                <td className="p-3 max-w-[200px] truncate text-emerald-800" title={log.user_agent}>
                                                    {log.user_agent}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // ── RENDER SESSION CONTROL ─────────────────────────────────────────
    if (tab === 'session_control') {
        return (
            <div className="space-y-4 font-mono text-emerald-400">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-500">Active Node Command</h3>
                    <button 
                        onClick={fetchSessions}
                        className="flex items-center gap-1 text-[10px] bg-neutral-900 border border-emerald-500/20 hover:border-emerald-500 px-2.5 py-1 text-emerald-500 rounded-none transition-all"
                    >
                        <RefreshCw size={10} />
                        Refresh Nodes
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {sessions.length === 0 ? (
                        <div className="col-span-2 p-12 text-center border border-emerald-950 rounded-none text-emerald-800">
                            No active communication nodes trace
                        </div>
                    ) : (
                        sessions.map((s) => (
                            <div key={s.socketId} className="bg-black/60 border border-emerald-500/20 rounded-none p-4 flex flex-col justify-between space-y-4 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-emerald-300 truncate text-[13px]">{s.full_name}</p>
                                            <span className="px-1.5 py-0.2 bg-emerald-950 border border-emerald-800 text-emerald-500 rounded-none text-[9px] uppercase font-bold shrink-0">
                                                {s.role}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-emerald-600 mt-1 truncate font-mono">
                                            UID: {s.id} · SID: {s.socketId.substring(0, 8)}...
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-emerald-950 text-emerald-400 border border-emerald-900 text-[10px] shrink-0 font-bold">
                                        <Eye size={11} className="text-emerald-500" />
                                        <span>{s.page || 'Dashboard'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-emerald-950 pt-3 text-[10px]">
                                    <div className="text-emerald-700">
                                        Last active: {new Date(s.lastSeen).toLocaleTimeString()}
                                    </div>
                                    <button
                                        onClick={() => handleForceLogout(s.socketId)}
                                        className="flex items-center gap-1 px-3 py-1 bg-rose-950/60 border border-rose-900 hover:bg-rose-900 hover:text-white hover:border-rose-600 text-rose-400 rounded-none transition-all font-bold"
                                    >
                                        <LogOut size={10} />
                                        Force Logout
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    return null;
}
