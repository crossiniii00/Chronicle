import React, { useState } from 'react';
import { X, Gamepad2, Trophy, LayoutGrid } from 'lucide-react';
import { SnakeGame } from './SecretGames/SnakeGame.tsx';
import { AlienInvadersGame } from './SecretGames/AlienInvadersGame.tsx';
import { BounceGame } from './SecretGames/BounceGame.tsx';
import { SolitaireGame } from './SecretGames/SolitaireGame.tsx';
import { FighterGame } from './SecretGames/FighterGame.tsx';
import { SecretGamesLeaderboard } from './SecretGames/SecretGamesLeaderboard.tsx';
import { HorseBettingGame } from './SecretGames/HorseBettingGame.tsx';
import { ChickenBettingGame } from './SecretGames/ChickenBettingGame.tsx';

// Force IDE re-evaluation

interface SecretGamesDashboardModalProps {
    open: boolean;
    onClose: () => void;
}

export function SecretGamesDashboardModal({ open, onClose }: SecretGamesDashboardModalProps) {
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'games' | 'leaderboards'>('games');

    if (!open) return null;

    const games = [
        { id: 'snake', name: 'Snake', description: 'Classic snake game.', color: 'from-green-500 to-green-700' },
        { id: 'alien', name: 'Alien Invaders', description: 'Defend against the alien invasion.', color: 'from-blue-500 to-indigo-700' },
        { id: 'bounce', name: 'Bounce', description: 'Classic bouncing ball adventure.', color: 'from-red-500 to-red-700' },
        { id: 'solitaire', name: 'Solitaire', description: 'Lightweight Klondike Solitaire.', color: 'from-green-600 to-emerald-800' },
        { id: 'fighter', name: 'Fighter', description: '2D Pixel Fighting Game.', color: 'from-orange-500 to-red-600' },
        { id: 'horse', name: 'Derby Day', description: 'Virtual horse betting.', color: 'from-amber-500 to-amber-700' },
        { id: 'chicken', name: 'Chicken Run', description: 'Erratic chicken casino.', color: 'from-orange-400 to-orange-500' }
    ];

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 text-left">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <Gamepad2 className="text-purple-600 w-6 h-6" />
                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Secret Arcade</h2>
                        {!selectedGame && (
                            <div className="ml-4 flex items-center bg-slate-200/50 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('games')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'games' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" /> Games
                                </button>
                                <button
                                    onClick={() => setActiveTab('leaderboards')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'leaderboards' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
                                >
                                    <Trophy className="w-4 h-4" /> Leaderboards
                                </button>
                            </div>
                        )}
                        {selectedGame && (
                            <>
                                <span className="text-slate-500 dark:text-slate-400">/</span>
                                <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">{games.find(g => g.id === selectedGame)?.name}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {selectedGame && (
                            <button 
                                onClick={() => setSelectedGame(null)}
                                className="text-xs font-bold px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors"
                            >
                                Back to Menu
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:text-white text-slate-500 dark:text-slate-400 rounded-md transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-50 dark:bg-slate-800">
                    {!selectedGame ? (
                        <>
                            {activeTab === 'games' ? (
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {games.map(game => (
                                            <div 
                                                key={game.id}
                                                onClick={() => setSelectedGame(game.id)}
                                                className={`group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 cursor-pointer hover:border-slate-300 dark:border-slate-700 transition-all hover:shadow-[0_0_30px_rgba(0,0,0,0.1)]`}
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 relative z-10">{game.name}</h3>
                                                <p className="text-sm text-slate-600 relative z-10">{game.description}</p>
                                                <div className="mt-6 flex justify-end relative z-10">
                                                    <span className="text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:text-white group-hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                        Play
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <SecretGamesLeaderboard />
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-4">
                            {selectedGame === 'snake' && <SnakeGame />}
                            {selectedGame === 'alien' && <AlienInvadersGame />}
                            {selectedGame === 'bounce' && <BounceGame />}
                            {selectedGame === 'solitaire' && <SolitaireGame />}
                            {selectedGame === 'fighter' && <FighterGame />}
                            {selectedGame === 'horse' && <HorseBettingGame />}
                            {selectedGame === 'chicken' && <ChickenBettingGame />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
