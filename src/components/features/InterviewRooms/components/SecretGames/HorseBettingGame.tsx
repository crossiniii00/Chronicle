import React, { useState, useEffect } from 'react';
import { DollarSign, Trophy, Flag, AlertCircle } from 'lucide-react';

const HORSES = [
    { id: 1, name: 'Lightning Bolt', color: 'bg-yellow-500', odds: 2.5 },
    { id: 2, name: 'Midnight Shadow', color: 'bg-slate-800', odds: 3.0 },
    { id: 3, name: 'Crimson Fury', color: 'bg-red-500', odds: 4.5 },
    { id: 4, name: 'Dusty Runner', color: 'bg-orange-400', odds: 6.0 },
    { id: 5, name: 'Lucky Star', color: 'bg-blue-400', odds: 8.0 },
];

export function HorseBettingGame() {
    const [balance, setBalance] = useState(1000);
    const [selectedHorse, setSelectedHorse] = useState<number | null>(null);
    const [betAmount, setBetAmount] = useState<number>(100);
    
    const [isRacing, setIsRacing] = useState(false);
    const [horsePositions, setHorsePositions] = useState<number[]>(Array(HORSES.length).fill(0));
    const [winner, setWinner] = useState<number | null>(null);
    const [payoutMessage, setPayoutMessage] = useState<{msg: string, isWin: boolean} | null>(null);

    // Race loop
    useEffect(() => {
        if (!isRacing) return;

        const interval = setInterval(() => {
            setHorsePositions(prev => {
                const newPos = [...prev];
                let raceFinished = false;

                // Move horses randomly
                for (let i = 0; i < newPos.length; i++) {
                    // Random speed burst based on odds (lower odds = slightly higher base speed, but high variance)
                    const horse = HORSES[i];
                    const baseSpeed = 1.5;
                    const burst = Math.random() * (12 - horse.odds / 2);
                    newPos[i] += baseSpeed + burst;

                    if (newPos[i] >= 100) {
                        newPos[i] = 100;
                        if (!raceFinished) {
                            raceFinished = true;
                            finishRace(i);
                        }
                    }
                }

                if (raceFinished) {
                    clearInterval(interval);
                }

                return newPos;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isRacing]);

    const finishRace = (winningIndex: number) => {
        setIsRacing(false);
        setWinner(HORSES[winningIndex].id);

        if (selectedHorse === HORSES[winningIndex].id) {
            const winAmount = Math.floor(betAmount * HORSES[winningIndex].odds);
            setBalance(prev => prev + winAmount);
            setPayoutMessage({ msg: `You won $${winAmount}!`, isWin: true });
        } else {
            setPayoutMessage({ msg: `You lost $${betAmount}.`, isWin: false });
        }
    };

    const startRace = () => {
        if (!selectedHorse || betAmount <= 0 || betAmount > balance) return;
        
        setBalance(prev => prev - betAmount);
        setWinner(null);
        setPayoutMessage(null);
        setHorsePositions(Array(HORSES.length).fill(0));
        setIsRacing(true);
    };

    return (
        <div className="flex flex-col w-full h-full max-w-4xl mx-auto p-4 sm:p-8 select-none">
            
            {/* Header Area */}
            <div className="flex items-center justify-between mb-8 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Flag className="w-6 h-6 text-green-600" />
                        Derby Day Racing
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Place your bets and watch them run!</p>
                </div>
                <div className="bg-green-50 px-6 py-3 rounded-lg border border-green-200 flex flex-col items-end">
                    <span className="text-xs uppercase font-bold text-green-600 mb-1">Your Balance</span>
                    <span className="text-2xl font-black text-green-700 flex items-center">
                        <DollarSign className="w-6 h-6" />
                        {balance.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Track Area */}
            <div className="bg-amber-100/50 rounded-xl border-4 border-amber-900/10 p-4 mb-8 overflow-hidden relative shadow-inner">
                {/* Finish Line */}
                <div className="absolute right-4 top-0 bottom-0 w-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2ZmZiIvPjxyZWN0IHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==')] opacity-50 z-0"></div>

                <div className="flex flex-col gap-3 relative z-10">
                    {HORSES.map((horse, i) => (
                        <div key={horse.id} className="relative h-12 bg-white/40 dark:bg-slate-900/40 rounded-full flex items-center px-2">
                            {/* Track lines */}
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-amber-900/10 -z-10"></div>
                            
                            {/* Horse */}
                            <div 
                                className={`absolute h-8 w-12 rounded-full shadow-md flex items-center justify-center transition-all duration-100 ease-linear ${horse.color} ${winner === horse.id ? 'ring-4 ring-yellow-400' : ''}`}
                                style={{ 
                                    left: `${horsePositions[i]}%`, 
                                    transform: `translateX(-${horsePositions[i]}%)`,
                                    zIndex: winner === horse.id ? 20 : 10
                                }}
                            >
                                <span className="text-white text-xs font-black">#{horse.id}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Betting Area */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                
                {payoutMessage && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center justify-center gap-3 font-bold text-lg animate-bounce ${payoutMessage.isWin ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {payoutMessage.isWin ? <Trophy className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                        {payoutMessage.msg}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Pick Horse */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">1. Pick Your Horse</h3>
                        <div className="flex flex-col gap-2">
                            {HORSES.map(horse => (
                                <button
                                    key={horse.id}
                                    onClick={() => !isRacing && setSelectedHorse(horse.id)}
                                    disabled={isRacing}
                                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${selectedHorse === horse.id ? 'border-purple-500 bg-purple-50' : 'border-slate-200 dark:border-slate-800 hover:border-purple-200'} ${isRacing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full ${horse.color}`}></div>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{horse.name}</span>
                                    </div>
                                    <span className="font-mono font-bold text-slate-500 dark:text-slate-400">{horse.odds}x</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Place Bet */}
                    <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">2. Place Your Bet</h3>
                        
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex-1 flex flex-col justify-center">
                            
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <button 
                                    onClick={() => setBetAmount(Math.max(10, betAmount - 100))}
                                    disabled={isRacing}
                                    className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 dark:text-slate-300 font-black hover:bg-slate-300 disabled:opacity-50"
                                >-</button>
                                <div className="text-3xl font-black text-slate-800 dark:text-slate-200 flex items-center min-w-[120px] justify-center">
                                    <DollarSign className="w-6 h-6 text-slate-400" />
                                    {betAmount}
                                </div>
                                <button 
                                    onClick={() => setBetAmount(Math.min(balance, betAmount + 100))}
                                    disabled={isRacing}
                                    className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 dark:text-slate-300 font-black hover:bg-slate-300 disabled:opacity-50"
                                >+</button>
                            </div>

                            <div className="flex gap-2 justify-center mb-8">
                                {[50, 100, 500, 'MAX'].map(val => (
                                    <button 
                                        key={val}
                                        onClick={() => !isRacing && setBetAmount(val === 'MAX' ? balance : Number(val))}
                                        disabled={isRacing}
                                        className="px-3 py-1 bg-slate-200 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-300 transition-colors disabled:opacity-50"
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={startRace}
                                disabled={isRacing || !selectedHorse || betAmount > balance || betAmount <= 0}
                                className="w-full py-4 rounded-xl font-black text-lg text-white transition-all transform active:scale-95 shadow-xl disabled:active:scale-100 disabled:shadow-none bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed"
                            >
                                {isRacing ? 'RACING...' : 'PLACE BET & START'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}
