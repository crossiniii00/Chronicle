import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 25;
const INITIAL_SPEED = 110;

type Point = { x: number; y: number };

export function SnakeGame() {
    const [snake, setSnake] = useState<Point[]>([{ x: 12, y: 12 }]);
    const [food, setFood] = useState<Point>({ x: 18, y: 12 });
    const [dir, setDir] = useState<Point>({ x: 1, y: 0 });
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const dirRef = useRef(dir);
    const containerRef = useRef<HTMLDivElement>(null);

    const generateFood = useCallback((currentSnake: Point[]) => {
        let newFood: Point;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
            if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
                break;
            }
        }
        return newFood;
    }, []);

    const resetGame = () => {
        setSnake([{ x: 12, y: 12 }]);
        setDir({ x: 1, y: 0 });
        dirRef.current = { x: 1, y: 0 };
        setFood(generateFood([{ x: 12, y: 12 }]));
        setGameOver(false);
        setScore(0);
        setIsPlaying(true);
        containerRef.current?.focus();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying) return;
            // Prevent default scrolling when playing
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
            switch (e.key) {
                case 'ArrowUp': if (dirRef.current.y === 0) setDir({ x: 0, y: -1 }); break;
                case 'ArrowDown': if (dirRef.current.y === 0) setDir({ x: 0, y: 1 }); break;
                case 'ArrowLeft': if (dirRef.current.x === 0) setDir({ x: -1, y: 0 }); break;
                case 'ArrowRight': if (dirRef.current.x === 0) setDir({ x: 1, y: 0 }); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying]);

    useEffect(() => {
        if (!isPlaying || gameOver) return;

        dirRef.current = dir;

        const moveSnake = () => {
            setSnake(prev => {
                const head = prev[0];
                let nx = head.x + dir.x;
                let ny = head.y + dir.y;

                // Screen Wrap (Nokia style)
                if (nx < 0) nx = GRID_SIZE - 1;
                if (nx >= GRID_SIZE) nx = 0;
                if (ny < 0) ny = GRID_SIZE - 1;
                if (ny >= GRID_SIZE) ny = 0;

                const newHead = { x: nx, y: ny };

                // Collision with self
                if (prev.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                    setGameOver(true);
                    return prev;
                }

                const newSnake = [newHead, ...prev];

                // Check food
                if (newHead.x === food.x && newHead.y === food.y) {
                    setScore(s => s + 10);
                    setFood(generateFood(newSnake));
                } else {
                    newSnake.pop();
                }

                return newSnake;
            });
        };

        // Speed increases slightly as score goes up
        const speed = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 5);
        const interval = setInterval(moveSnake, speed);
        return () => clearInterval(interval);
    }, [dir, food, gameOver, isPlaying, generateFood, score]);

    // Helper to determine rotation for snake parts
    const getRotation = (current: Point, next: Point) => {
        if (!next) return 0;
        if (current.x === next.x && current.y > next.y) return 0; // facing up
        if (current.x === next.x && current.y < next.y) return 180; // facing down
        if (current.y === next.y && current.x > next.x) return 270; // facing left
        if (current.y === next.y && current.x < next.x) return 90; // facing right
        return 0; // Default or wrapped edge handling
    };

    return (
        <div 
            ref={containerRef}
            className="flex flex-col items-center justify-center h-full outline-none p-4"
            tabIndex={0}
        >
            <div className="mb-6 flex justify-between w-full max-w-[600px] items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                        <span className="text-white font-black text-xl">S</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">Super Snake</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-xl font-mono text-slate-800 dark:text-slate-200 font-bold">Score: <span className="text-green-600">{score}</span></p>
                </div>
            </div>

            <div 
                className="relative bg-emerald-50/50 border-4 border-slate-800 rounded-xl shadow-2xl overflow-hidden"
                style={{ width: 600, height: 600 }}
            >
                {/* Checkerboard Background Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%, transparent 75%, #cbd5e1 75%, #cbd5e1), linear-gradient(45deg, #cbd5e1 25%, transparent 25%, transparent 75%, #cbd5e1 75%, #cbd5e1)',
                    backgroundSize: `${600/GRID_SIZE*2}px ${600/GRID_SIZE*2}px`,
                    backgroundPosition: `0 0, ${600/GRID_SIZE}px ${600/GRID_SIZE}px`
                }} />

                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
                        <div className="w-24 h-24 bg-green-500 rounded-full mb-6 shadow-xl shadow-green-500/40 flex items-center justify-center animate-bounce">
                            <span className="text-white text-5xl">🐍</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-6">Ready to play?</h2>
                        <button onClick={resetGame} className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full uppercase tracking-wider shadow-xl transition-all hover:scale-105 active:scale-95 text-lg">
                            Start Game
                        </button>
                    </div>
                )}
                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-20 text-slate-900 dark:text-white">
                        <span className="text-6xl mb-4">💥</span>
                        <h2 className="text-4xl font-black text-red-600 mb-2">GAME OVER</h2>
                        <p className="text-xl mb-8 font-bold text-slate-600">You scored <span className="text-slate-900 dark:text-white text-2xl">{score}</span> points</p>
                        <button onClick={resetGame} className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full uppercase tracking-wider shadow-xl transition-all hover:scale-105 active:scale-95 text-lg">
                            Play Again
                        </button>
                    </div>
                )}

                {/* Absolute Positioning Rendering for smooth look */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {/* Food (Apple) */}
                    <div 
                        className="absolute flex items-center justify-center transition-all duration-300"
                        style={{ 
                            left: `${(food.x / GRID_SIZE) * 100}%`, 
                            top: `${(food.y / GRID_SIZE) * 100}%`,
                            width: `${100 / GRID_SIZE}%`, 
                            height: `${100 / GRID_SIZE}%` 
                        }}
                    >
                        <div className="w-[80%] h-[80%] bg-red-500 rounded-full shadow-md shadow-red-500/40 relative animate-pulse">
                            {/* Apple Leaf */}
                            <div className="absolute -top-1 right-1 w-2 h-2 bg-green-400 rounded-t-full rounded-br-full -rotate-45"></div>
                        </div>
                    </div>

                    {/* Snake Segments */}
                    {snake.map((segment, index) => {
                        const isHead = index === 0;
                        const isTail = index === snake.length - 1 && snake.length > 1;
                        
                        // For head, determine rotation based on current movement direction
                        // For body, base it on the next segment
                        let rotation = 0;
                        if (isHead) {
                            if (dir.x === 1) rotation = 90;
                            if (dir.x === -1) rotation = 270;
                            if (dir.y === 1) rotation = 180;
                            if (dir.y === -1) rotation = 0;
                        } else {
                            rotation = getRotation(segment, snake[index - 1]);
                        }

                        return (
                            <div 
                                key={`${segment.x}-${segment.y}-${index}`} 
                                className="absolute flex items-center justify-center"
                                style={{ 
                                    left: `${(segment.x / GRID_SIZE) * 100}%`, 
                                    top: `${(segment.y / GRID_SIZE) * 100}%`,
                                    width: `${100 / GRID_SIZE}%`, 
                                    height: `${100 / GRID_SIZE}%`,
                                    zIndex: isHead ? 30 : 20 - index
                                }}
                            >
                                <div 
                                    className={`
                                        w-full h-full bg-green-500 shadow-sm
                                        ${isHead ? 'bg-green-400' : ''}
                                    `}
                                    style={{
                                        borderRadius: isHead ? '8px 8px 0 0' : isTail ? '0 0 12px 12px' : '0',
                                        transform: `rotate(${rotation}deg)`,
                                        border: '1px solid #16a34a'
                                    }}
                                >
                                    {/* Snake Eyes on Head */}
                                    {isHead && (
                                        <div className="absolute top-1 left-0 right-0 flex justify-around px-1">
                                            <div className="w-1.5 h-1.5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                                                <div className="w-0.5 h-0.5 bg-black rounded-full" />
                                            </div>
                                            <div className="w-1.5 h-1.5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                                                <div className="w-0.5 h-0.5 bg-black rounded-full" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="mt-8 flex items-center gap-4">
                <div className="flex gap-1">
                    <kbd className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 border-b-4 rounded-lg text-slate-500 dark:text-slate-400 font-bold">←</kbd>
                    <div className="flex flex-col gap-1">
                        <kbd className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 border-b-4 rounded-lg text-slate-500 dark:text-slate-400 font-bold">↑</kbd>
                        <kbd className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 border-b-4 rounded-lg text-slate-500 dark:text-slate-400 font-bold">↓</kbd>
                    </div>
                    <kbd className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 border-b-4 rounded-lg text-slate-500 dark:text-slate-400 font-bold">→</kbd>
                </div>
                <span className="text-slate-500 dark:text-slate-400 font-medium">Use arrow keys to move. Wall wrapping is enabled!</span>
            </div>
        </div>
    );
}
