import React, { useState, useEffect } from 'react';
import { DollarSign, Trophy, Flag, AlertCircle } from 'lucide-react';

const CHICKENS = [
    { id: 1, name: 'Cluck Norris', emoji: '🐔', color: 'bg-red-100 border-red-300 text-red-600', odds: 2.0 },
    { id: 2, name: 'Hennifer Lopez', emoji: '🐥', color: 'bg-yellow-100 border-yellow-300 text-yellow-600', odds: 3.5 },
    { id: 3, name: 'Albert Eggstein', emoji: '🐣', color: 'bg-blue-100 border-blue-300 text-blue-600', odds: 5.0 },
    { id: 4, name: 'Kylo Hen', emoji: '🐓', color: 'bg-slate-800 border-slate-900 text-slate-100', odds: 7.0 },
    { id: 5, name: 'Mothra', emoji: '🦢', color: 'bg-purple-100 border-purple-300 text-purple-600', odds: 10.0 },
];

export function ChickenBettingGame() {
    const [balance, setBalance] = useState(500);
    const [selectedChicken, setSelectedChicken] = useState<number | null>(null);
    const [betAmount, setBetAmount] = useState<number>(50);
    
    const [isRacing, setIsRacing] = useState(false);
    const [chickenPositions, setChickenPositions] = useState<number[]>(Array(CHICKENS.length).fill(0));
    const [winner, setWinner] = useState<number | null>(null);
    const [payoutMessage, setPayoutMessage] = useState<{msg: string, isWin: boolean} | null>(null);

    // Race loop
    useEffect(() => {
        if (!isRacing) return;

        const interval = setInterval(() => {
            setChickenPositions(prev => {
                const newPos = [...prev];
                let raceFinished = false;

                // Move randomly
                for (let i = 0; i < newPos.length; i++) {
                    const chicken = CHICKENS[i];
                    // Chickens are erratic
                    const erraticBurst = Math.random() > 0.8 ? (Math.random() * 15) : (Math.random() * 3);
                    newPos[i] += erraticBurst - (chicken.odds * 0.2); // high odds = slower on average

                    if (newPos[i] < 0) newPos[i] = 0; // Don't go backwards too far
                    
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
        }, 150);

        return () => clearInterval(interval);
    }, [isRacing]);

    const finishRace = (winningIndex: number) => {
        setIsRacing(false);
        setWinner(CHICKENS[winningIndex].id);

        if (selectedChicken === CHICKENS[winningIndex].id) {
            const winAmount = Math.floor(betAmount * CHICKENS[winningIndex].odds);
            setBalance(prev => prev + winAmount);
            setPayoutMessage({ msg: `Winner Winner Chicken Dinner! +$${winAmount}`, isWin: true });
        } else {
            setPayoutMessage({ msg: `You backed the wrong bird. -$${betAmount}`, isWin: false });
        }
    };

    const startRace = () => {
        if (!selectedChicken || betAmount <= 0 || betAmount > balance) return;
        
        setBalance(prev => prev - betAmount);
        setWinner(null);
        setPayoutMessage(null);
        setChickenPositions(Array(CHICKENS.length).fill(0));
        setIsRacing(true);
    };

    return (
        <div className="flex flex-col w-full h-full max-w-4xl mx-auto p-4 sm:p-8 select-none">
            
            {/* Header Area */}
            <div className="flex items-center justify-between mb-8 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="text-2xl">🐓</span>
                        Chicken Run Casino
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Erratic racing with feathered athletes.</p>
                </div>
                <div className="bg-orange-50 px-6 py-3 rounded-lg border border-orange-200 flex flex-col items-end">
                    <span className="text-xs uppercase font-bold text-orange-600 mb-1">Your Coins</span>
                    <span className="text-2xl font-black text-orange-700 flex items-center">
                        <DollarSign className="w-6 h-6" />
                        {balance.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Track Area */}
            <div className="bg-green-100 rounded-xl border-4 border-green-800/10 p-4 mb-8 overflow-hidden relative shadow-inner">
                {/* Finish Line */}
                <div className="absolute right-4 top-0 bottom-0 w-2 border-r-4 border-dashed border-red-500 opacity-80 z-0"></div>

                <div className="flex flex-col gap-4 relative z-10">
                    {CHICKENS.map((chicken, i) => (
                        <div key={chicken.id} className="relative h-12 bg-white/20 dark:bg-slate-900/20 rounded-full flex items-center">
                            
                            {/* Chicken */}
                            <div 
                                className={`absolute h-10 w-10 rounded-full border-2 flex items-center justify-center text-xl transition-all duration-150 ease-in-out ${chicken.color} ${winner === chicken.id ? 'ring-4 ring-yellow-400 scale-125 z-20' : 'z-10'} ${isRacing ? 'animate-bounce' : ''}`}
                                style={{ 
                                    left: `${chickenPositions[i]}%`, 
                                    transform: `translateX(-${chickenPositions[i]}%)`,
                                }}
                            >
                                {chicken.emoji}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Betting Area */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                
                {payoutMessage && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center justify-center gap-3 font-bold text-lg animate-bounce ${payoutMessage.isWin ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {payoutMessage.isWin ? <Trophy className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                        {payoutMessage.msg}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Pick Chicken */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">1. Choose Your Bird</h3>
                        <div className="flex flex-col gap-2">
                            {CHICKENS.map(chicken => (
                                <button
                                    key={chicken.id}
                                    onClick={() => !isRacing && setSelectedChicken(chicken.id)}
                                    disabled={isRacing}
                                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${selectedChicken === chicken.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 dark:border-slate-800 hover:border-orange-200'} ${isRacing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm ${chicken.color}`}>
                                            {chicken.emoji}
                                        </div>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{chicken.name}</span>
                                    </div>
                                    <span className="font-mono font-bold text-slate-500 dark:text-slate-400">{chicken.odds}x</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Place Bet */}
                    <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">2. Wager Amount</h3>
                        
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex-1 flex flex-col justify-center">
                            
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <button 
                                    onClick={() => setBetAmount(Math.max(10, betAmount - 50))}
                                    disabled={isRacing}
                                    className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 dark:text-slate-300 font-black hover:bg-slate-300 disabled:opacity-50"
                                >-</button>
                                <div className="text-3xl font-black text-slate-800 dark:text-slate-200 flex items-center min-w-[120px] justify-center">
                                    <DollarSign className="w-6 h-6 text-slate-400" />
                                    {betAmount}
                                </div>
                                <button 
                                    onClick={() => setBetAmount(Math.min(balance, betAmount + 50))}
                                    disabled={isRacing}
                                    className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 dark:text-slate-300 font-black hover:bg-slate-300 disabled:opacity-50"
                                >+</button>
                            </div>

                            <div className="flex gap-2 justify-center mb-8">
                                {[10, 50, 100, 'MAX'].map(val => (
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
                                disabled={isRacing || !selectedChicken || betAmount > balance || betAmount <= 0}
                                className="w-full py-4 rounded-xl font-black text-lg text-white transition-all transform active:scale-95 shadow-xl disabled:active:scale-100 disabled:shadow-none bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed"
                            >
                                {isRacing ? 'THE FLOCK IS FLYING...' : 'WAGER & RELEASE BIRDS'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}
