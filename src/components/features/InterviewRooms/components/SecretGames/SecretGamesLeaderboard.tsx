import React, { useState } from 'react';
import { Trophy, Medal, Award, Coffee, User } from 'lucide-react';

const MOCK_LEADERBOARD: any[] = [];

export function SecretGamesLeaderboard() {
    const [selectedGame, setSelectedGame] = useState('all');
    const [timeFilter, setTimeFilter] = useState('all_time');

    const top3 = MOCK_LEADERBOARD.slice(0, 3);
    const rest = MOCK_LEADERBOARD.slice(3);

    return (
        <div className="flex flex-col h-full overflow-hidden w-full">
            {/* Header / Filters */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy className="text-yellow-500 w-6 h-6" /> 
                        Arcade Leaderboards
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">See how you stack up against the competition.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select 
                        value={selectedGame} 
                        onChange={(e) => setSelectedGame(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500"
                    >
                        <option value="all">All Games</option>
                        <option value="snake">Snake</option>
                        <option value="alien">Alien Invaders</option>
                        <option value="bounce">Bounce</option>
                        <option value="solitaire">Solitaire</option>
                        <option value="fighter">Fighter</option>
                    </select>
                    
                    <select 
                        value={timeFilter} 
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500"
                    >
                        <option value="all_time">All Time</option>
                        <option value="this_month">This Month</option>
                        <option value="this_week">This Week</option>
                        <option value="today">Today</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800 custom-scrollbar relative w-full">
                
                {/* Promo Banner */}
                <div className="mb-8 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 transform rotate-12">
                        <Coffee className="w-48 h-48" />
                    </div>
                    <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                        <div className="p-3 bg-white/20 dark:bg-slate-900/20 rounded-full shrink-0">
                            <Coffee className="w-8 h-8 text-emerald-100" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black">Starbucks Coffee Challenge!</h4>
                            <p className="text-emerald-50 font-medium mt-1">The first <span className="font-bold text-white">1,000 players</span> to reach a score of <span className="font-bold text-white">1,000+</span> in any game will receive a free Starbucks coffee reward!</p>
                        </div>
                    </div>
                </div>

                {MOCK_LEADERBOARD.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                            <Trophy className="w-12 h-12 text-slate-400" />
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-2">No Scores Yet!</h4>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm">Be the first to play a game and claim the top spot on the leaderboard.</p>
                    </div>
                ) : (
                    <>
                        {/* Top 3 Crown Leaderboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-3xl mx-auto">
                            {/* 2nd Place */}
                            <div className="order-2 md:order-1 flex flex-col items-center justify-end mt-6">
                                <div className="w-20 h-20 bg-slate-200 rounded-full border-4 border-slate-300 dark:border-slate-700 flex items-center justify-center relative shadow-md">
                                    <User className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                                    <div className="absolute -bottom-3 bg-slate-400 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-sm">
                                        2ND
                                    </div>
                                </div>
                                <div className="mt-5 text-center">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{top3[1]?.name}</p>
                                    <p className="text-lg font-black text-slate-600">{top3[1]?.score?.toLocaleString()} pts</p>
                                </div>
                            </div>

                            {/* 1st Place */}
                            <div className="order-1 md:order-2 flex flex-col items-center">
                                <div className="w-28 h-28 bg-yellow-100 rounded-full border-4 border-yellow-400 flex items-center justify-center relative shadow-xl transform scale-105 z-10">
                                    <Trophy className="w-12 h-12 text-yellow-500" />
                                    <div className="absolute -top-4 text-yellow-500 text-2xl">
                                        👑
                                    </div>
                                    <div className="absolute -bottom-3 bg-yellow-500 text-white text-sm font-black px-3 py-1 rounded-full border-2 border-white shadow-sm">
                                        1ST
                                    </div>
                                </div>
                                <div className="mt-5 text-center">
                                    <p className="font-black text-slate-900 dark:text-white text-lg">{top3[0]?.name}</p>
                                    <p className="text-xl font-black text-yellow-600">{top3[0]?.score?.toLocaleString()} pts</p>
                                </div>
                            </div>

                            {/* 3rd Place */}
                            <div className="order-3 flex flex-col items-center justify-end mt-6">
                                <div className="w-20 h-20 bg-orange-50 rounded-full border-4 border-orange-300 flex items-center justify-center relative shadow-md">
                                    <Award className="w-8 h-8 text-orange-400" />
                                    <div className="absolute -bottom-3 bg-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-sm">
                                        3RD
                                    </div>
                                </div>
                                <div className="mt-5 text-center">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{top3[2]?.name}</p>
                                    <p className="text-lg font-black text-orange-600">{top3[2]?.score?.toLocaleString()} pts</p>
                                </div>
                            </div>
                        </div>

                        {/* Rest of Leaderboard */}
                        {rest.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                                            <th className="p-4 w-16 text-center">Rank</th>
                                            <th className="p-4">Player</th>
                                            <th className="p-4">Score</th>
                                            <th className="p-4 text-right">Date Achieved</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rest.map((player) => (
                                            <tr key={player.rank} className="border-b border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors">
                                                <td className="p-4 text-center font-bold text-slate-500 dark:text-slate-400">#{player.rank}</td>
                                                <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{player.name}</td>
                                                <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">{player.score.toLocaleString()}</td>
                                                <td className="p-4 text-right text-slate-500 dark:text-slate-400 text-sm">{player.date}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    );
}
