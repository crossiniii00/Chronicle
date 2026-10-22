import React, { useEffect, useRef, useState } from 'react';

export function AlienInvadersGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!isPlaying || gameOver || gameWon) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        
        // Game State
        const player = { x: canvas.width / 2 - 15, y: canvas.height - 30, width: 30, height: 15, speed: 5, dx: 0 };
        const bullets: {x: number, y: number, radius: number, speed: number}[] = [];
        const aliens: {x: number, y: number, width: number, height: number, alive: boolean}[] = [];
        
        const ALIEN_ROWS = 4;
        const ALIEN_COLS = 8;
        let alienDirection = 1;
        let alienSpeed = 1;
        
        // Initialize Aliens
        for (let r = 0; r < ALIEN_ROWS; r++) {
            for (let c = 0; c < ALIEN_COLS; c++) {
                aliens.push({
                    x: c * 40 + 30,
                    y: r * 30 + 30,
                    width: 20,
                    height: 20,
                    alive: true
                });
            }
        }

        const keys: { [key: string]: boolean } = {};

        const handleKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
        
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                bullets.push({ x: player.x + player.width / 2, y: player.y, radius: 3, speed: 7 });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('keypress', handleKeyPress);

        const update = () => {
            // Player movement
            if (keys['ArrowLeft']) player.x -= player.speed;
            if (keys['ArrowRight']) player.x += player.speed;
            
            // Bounds
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

            // Bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].y -= bullets[i].speed;
                if (bullets[i].y < 0) {
                    bullets.splice(i, 1);
                    continue;
                }
                
                // Collision with aliens
                for (let j = 0; j < aliens.length; j++) {
                    const a = aliens[j];
                    if (a.alive && 
                        bullets[i] &&
                        bullets[i].x > a.x && 
                        bullets[i].x < a.x + a.width && 
                        bullets[i].y > a.y && 
                        bullets[i].y < a.y + a.height) 
                    {
                        a.alive = false;
                        bullets.splice(i, 1);
                        setScore(s => s + 10);
                        break;
                    }
                }
            }

            // Move Aliens
            let hitWall = false;
            let allDead = true;
            for (const a of aliens) {
                if (!a.alive) continue;
                allDead = false;
                a.x += alienSpeed * alienDirection;
                if (a.x <= 0 || a.x + a.width >= canvas.width) {
                    hitWall = true;
                }
                if (a.y + a.height >= player.y) {
                    setGameOver(true);
                }
            }

            if (hitWall) {
                alienDirection *= -1;
                for (const a of aliens) {
                    if (a.alive) a.y += 20;
                }
                alienSpeed += 0.2; // Increase speed slightly when dropping
            }

            if (allDead) {
                setGameWon(true);
            }
        };

        const draw = () => {
            ctx.fillStyle = '#ffffff'; // white
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Player
            ctx.fillStyle = '#3b82f6'; // blue-500
            ctx.fillRect(player.x, player.y, player.width, player.height);
            // Player Cannon
            ctx.fillRect(player.x + player.width/2 - 2.5, player.y - 5, 5, 5);

            // Draw Bullets
            ctx.fillStyle = '#ef4444'; // red-500
            for (const b of bullets) {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw Aliens
            ctx.fillStyle = '#22c55e'; // green-500
            for (const a of aliens) {
                if (a.alive) {
                    ctx.fillRect(a.x, a.y, a.width, a.height);
                }
            }
        };

        const loop = () => {
            update();
            draw();
            animationId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('keypress', handleKeyPress);
        };
    }, [isPlaying, gameOver, gameWon]);

    const startGame = () => {
        setScore(0);
        setGameOver(false);
        setGameWon(false);
        setIsPlaying(true);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full outline-none">
            <div className="mb-4 flex justify-between w-full max-w-[400px]">
                <h3 className="text-xl font-bold text-blue-600">Alien Invaders</h3>
                <p className="text-xl font-mono text-slate-800 dark:text-slate-200 font-bold">Score: {score}</p>
            </div>

            <div className="relative" style={{ width: 400, height: 400 }}>
                <canvas 
                    ref={canvasRef}
                    width={400}
                    height={400}
                    className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-lg shadow-sm"
                />

                {!isPlaying && !gameOver && !gameWon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 rounded-lg">
                        <button onClick={startGame} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md uppercase tracking-wider shadow-md transition-transform hover:scale-105 active:scale-95">
                            Start Game
                        </button>
                    </div>
                )}
                
                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 text-slate-900 dark:text-white rounded-lg">
                        <h2 className="text-3xl font-black text-red-600 mb-2">GAME OVER</h2>
                        <p className="text-lg mb-6 font-bold text-slate-700 dark:text-slate-300">Final Score: {score}</p>
                        <button onClick={startGame} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md uppercase tracking-wider shadow-md transition-transform hover:scale-105 active:scale-95">
                            Try Again
                        </button>
                    </div>
                )}

                {gameWon && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-50/95 backdrop-blur-sm z-10 text-slate-900 dark:text-white rounded-lg border border-emerald-200">
                        <h2 className="text-3xl font-black text-emerald-600 mb-2">YOU WIN!</h2>
                        <p className="text-lg mb-6 font-bold text-slate-700 dark:text-slate-300">Final Score: {score}</p>
                        <button onClick={startGame} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md uppercase tracking-wider shadow-md transition-transform hover:scale-105 active:scale-95">
                            Play Again
                        </button>
                    </div>
                )}
            </div>
            
            <div className="mt-4 text-slate-500 dark:text-slate-400 text-sm text-center">
                Use <kbd className="bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded mx-1 shadow-sm text-slate-700 dark:text-slate-300 font-mono text-xs">Left/Right Arrows</kbd> to move.<br/>
                Press <kbd className="bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded mx-1 mt-2 inline-block shadow-sm text-slate-700 dark:text-slate-300 font-mono text-xs">Space</kbd> to shoot.
            </div>
        </div>
    );
}
// refresh
