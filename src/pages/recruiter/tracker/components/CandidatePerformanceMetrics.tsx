import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Target, Activity, TrendingUp, AlertCircle, Award } from 'lucide-react';
import type { Application } from '@/types/application';

interface CandidatePerformanceMetricsProps {
    application: Application;
}

export function CandidatePerformanceMetrics({ application }: CandidatePerformanceMetricsProps) {
    // Determine candidate metrics
    const typingWpm = application.typing_test_wpm || 0;
    const typingAccuracy = application.typing_test_accuracy || 0;
    const assessmentScore = application.assessment_score || 0;
    
    // Fallback Mock Averages
    const AVG_WPM = 42;
    const AVG_ACCURACY = 94;
    const AVG_ASSESSMENT = 75;

    const TOP_10_WPM = 65;
    const TOP_10_ACCURACY = 98;
    const TOP_10_ASSESSMENT = 92;

    const typingData = [
        { name: 'WPM', Candidate: typingWpm, Average: AVG_WPM, Top10: TOP_10_WPM },
        { name: 'Accuracy', Candidate: typingAccuracy, Average: AVG_ACCURACY, Top10: TOP_10_ACCURACY },
    ];

    const assessmentData = [
        { subject: 'Communication', Candidate: assessmentScore, Average: AVG_ASSESSMENT, fullMark: 100 },
        { subject: 'Problem Solving', Candidate: Math.min(100, assessmentScore + 5), Average: AVG_ASSESSMENT - 5, fullMark: 100 },
        { subject: 'Technical', Candidate: Math.max(0, assessmentScore - 10), Average: AVG_ASSESSMENT + 5, fullMark: 100 },
        { subject: 'Adaptability', Candidate: Math.min(100, assessmentScore + 8), Average: AVG_ASSESSMENT, fullMark: 100 },
        { subject: 'Culture Fit', Candidate: Math.min(100, assessmentScore + 12), Average: AVG_ASSESSMENT + 10, fullMark: 100 },
    ];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-900 border border-surface-200 p-3 rounded-lg shadow-lg text-xs z-50 relative">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 py-1">
                            <span style={{ color: entry.color }} className="font-semibold">{entry.name}:</span>
                            <span className="font-mono font-bold">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto h-full">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <TrendingUp className="text-primary-600 w-6 h-6" />
                        Candidate Analytics
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Comparative performance against platform averages</p>
                </div>
                
                {assessmentScore > TOP_10_ASSESSMENT && (
                    <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full border border-amber-200 shadow-sm animate-fade-in">
                        <Award className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Top 10% Candidate</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0">
                
                {/* Typing Performance Chart */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-surface-200 shadow-sm flex flex-col h-[320px]">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                        <Activity className="w-5 h-5 text-blue-500" />
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Typing Benchmark</h3>
                    </div>
                    
                    {typingWpm > 0 ? (
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={typingData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                                    <Bar dataKey="Candidate" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={1000} />
                                    <Bar dataKey="Average" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={1000} />
                                    <Bar dataKey="Top10" name="Top 10%" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={1000} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 mt-4">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm font-medium">No typing test recorded</p>
                        </div>
                    )}
                </div>

                {/* Assessment Radar Chart */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-surface-200 shadow-sm flex flex-col h-[320px]">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                        <Target className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Skill Profile</h3>
                    </div>
                    
                    {assessmentScore > 0 ? (
                        <div className="flex-1 min-h-0 relative -mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={assessmentData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Radar name="Candidate" dataKey="Candidate" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} animationDuration={1000} />
                                    <Radar name="Average" dataKey="Average" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} animationDuration={1000} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 mt-4">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm font-medium">No assessment scores available</p>
                        </div>
                    )}
                </div>

                {/* Summary Metrics Row */}
                <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-surface-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Percentile Rank</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                                {assessmentScore > 0 ? `Top ${Math.max(1, Math.round((100 - assessmentScore) / 1.5))}%` : 'N/A'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 ml-4">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-surface-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Interview Readiness</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                                {assessmentScore > 85 ? 'High' : assessmentScore > 65 ? 'Moderate' : assessmentScore > 0 ? 'Low' : 'Pending'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ml-4">
                            <Target className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-surface-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Overall Match</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                                {assessmentScore > 0 ? `${Math.round(assessmentScore * 0.7 + typingWpm * 0.3)} / 100` : 'N/A'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 ml-4">
                            <Award className="w-5 h-5" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
