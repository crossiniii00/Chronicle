import React, { useEffect, useRef, useState } from 'react';

// Level definitions (Now wider and taller than the viewport)
const LEVELS = [
    {
        width: 1600,
        height: 800,
        platforms: [
            { x: 0, y: 700, w: 600, h: 100 }, // start platform
            { x: 700, y: 650, w: 200, h: 50 },
            { x: 1000, y: 550, w: 150, h: 50 },
            { x: 1250, y: 450, w: 350, h: 50 },
            { x: 1000, y: 300, w: 150, h: 50 },
            { x: 600, y: 250, w: 200, h: 50 },
        ],
        rings: [
            { x: 800, y: 580, radius: 16, collected: false },
            { x: 1075, y: 480, radius: 16, collected: false },
            { x: 1400, y: 380, radius: 16, collected: false },
            { x: 700, y: 180, radius: 16, collected: false }
        ],
        spikes: [
            { x: 600, y: 750, w: 1000, h: 50 }, // death pit across the bottom
            { x: 1300, y: 400, w: 50, h: 50 }
        ]
    },
    {
        width: 2000,
        height: 1000,
        platforms: [
            { x: 0, y: 900, w: 400, h: 100 },
            { x: 550, y: 800, w: 150, h: 50 },
            { x: 800, y: 700, w: 150, h: 50 },
            { x: 1050, y: 600, w: 150, h: 50 },
            { x: 1300, y: 500, w: 150, h: 50 },
            { x: 1600, y: 500, w: 400, h: 50 },
            { x: 1400, y: 250, w: 150, h: 50 },
            { x: 1050, y: 250, w: 150, h: 50 }
        ],
        rings: [
            { x: 625, y: 730, radius: 16, collected: false },
            { x: 1125, y: 530, radius: 16, collected: false },
            { x: 1750, y: 430, radius: 16, collected: false },
            { x: 1125, y: 180, radius: 16, collected: false }
        ],
        spikes: [
            { x: 400, y: 950, w: 1600, h: 50 }, // Giant lava floor
            { x: 1650, y: 450, w: 100, h: 50 }
        ]
    }
];

export function BounceGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(0);

    useEffect(() => {
        if (!isPlaying || gameOver || gameWon) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        
        // Physics and State (Tuned for Nokia bounce feel)
        const ball = { 
            x: 100, y: 600, // Starting coordinates
            radius: 18, 
            vx: 0, vy: 0, 
            speed: 7, jump: -15, 
            color: '#ef4444' 
        };
        const gravity = 0.7;
        const friction = 0.85;
        const camera = { x: 0, y: 0 };
        
        // Deep copy level data so we can mutate rings
        const levelData = JSON.parse(JSON.stringify(LEVELS[currentLevel]));
        const platforms = levelData.platforms;
        const rings = levelData.rings;
        const spikes = levelData.spikes || [];

        const keys: { [key: string]: boolean } = {};

        const handleKeyDown = (e: KeyboardEvent) => { 
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            keys[e.code] = true; 
        };
        const handleKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
        
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp);

        const update = () => {
            // Apply forces
            if (keys['ArrowLeft']) ball.vx -= 1.0;
            if (keys['ArrowRight']) ball.vx += 1.0;
            
            // Limit speed
            if (ball.vx > ball.speed) ball.vx = ball.speed;
            if (ball.vx < -ball.speed) ball.vx = -ball.speed;

            // Apply friction and gravity
            ball.vx *= friction;
            ball.vy += gravity;

            // Update position
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Map Bounds
            if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx *= -0.8; }
            if (ball.x + ball.radius > levelData.width) { ball.x = levelData.width - ball.radius; ball.vx *= -0.8; }
            
            // Pit fall
            if (ball.y > levelData.height + 50) {
                setGameOver(true);
            }

            // Platform collision (AABB vs Circle approximation)
            let onGround = false;
            for (const p of platforms) {
                // Hitting top of platform
                if (ball.vy > 0 && 
                    ball.x > p.x - ball.radius * 0.5 && 
                    ball.x < p.x + p.w + ball.radius * 0.5 && 
                    ball.y + ball.radius >= p.y && 
                    ball.y + ball.radius <= p.y + ball.vy + 2) {
                    
                    ball.y = p.y - ball.radius;
                    if (ball.vy > 4) {
                        ball.vy *= -0.55; // Bounce elasticity
                    } else {
                        ball.vy = 0;
                        onGround = true;
                    }
                }
                
                // Hitting bottom of platform
                else if (ball.vy < 0 &&
                    ball.x > p.x && 
                    ball.x < p.x + p.w &&
                    ball.y - ball.radius <= p.y + p.h &&
                    ball.y - ball.radius >= p.y + p.h + ball.vy - 2) {
                    ball.y = p.y + p.h + ball.radius;
                    ball.vy = 0;
                }

                // Hitting sides
                // Right side
                else if (ball.vx < 0 &&
                    ball.y > p.y && ball.y < p.y + p.h &&
                    ball.x - ball.radius <= p.x + p.w &&
                    ball.x - ball.radius >= p.x + p.w + ball.vx - 2) {
                    ball.x = p.x + p.w + ball.radius;
                    ball.vx *= -0.5;
                }
                // Left side
                else if (ball.vx > 0 &&
                    ball.y > p.y && ball.y < p.y + p.h &&
                    ball.x + ball.radius >= p.x &&
                    ball.x + ball.radius <= p.x + ball.vx + 2) {
                    ball.x = p.x - ball.radius;
                    ball.vx *= -0.5;
                }
            }

            // Spikes collision (Death)
            for (const s of spikes) {
                if (ball.x + ball.radius * 0.7 > s.x && 
                    ball.x - ball.radius * 0.7 < s.x + s.w &&
                    ball.y + ball.radius * 0.7 > s.y && 
                    ball.y - ball.radius * 0.7 < s.y + s.h) {
                    setGameOver(true);
                }
            }

            // Jump
            if ((keys['ArrowUp'] || keys['Space']) && onGround) {
                ball.vy = ball.jump;
            }

            // Ring collision
            let allCollected = true;
            for (const r of rings) {
                if (!r.collected) {
                    const dx = ball.x - r.x;
                    const dy = ball.y - r.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < ball.radius + r.radius + 5) {
                        r.collected = true;
                        setScore(s => s + 100);
                    } else {
                        allCollected = false;
                    }
                }
            }

            // Update Camera (Track the ball with a delay/easing)
            const targetCamX = ball.x - canvas.width / 2;
            const targetCamY = ball.y - canvas.height / 2;
            
            camera.x += (targetCamX - camera.x) * 0.1;
            camera.y += (targetCamY - camera.y) * 0.1;

            // Clamp camera to map bounds
            if (camera.x < 0) camera.x = 0;
            if (camera.x > levelData.width - canvas.width) camera.x = levelData.width - canvas.width;
            if (camera.y < 0) camera.y = 0;
            if (camera.y > levelData.height - canvas.height) camera.y = levelData.height - canvas.height;

            // Level complete
            if (allCollected) {
                if (currentLevel < LEVELS.length - 1) {
                    setCurrentLevel(l => l + 1);
                } else {
                    setGameWon(true);
                }
            }
        };

        const draw = () => {
            // Background sky
            ctx.fillStyle = '#e0f2fe'; // sky-100
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            // Translate context to camera view
            ctx.translate(-camera.x, -camera.y);

            // Draw Level Boundaries (optional border)
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, levelData.width, levelData.height);

            // Draw Platforms (Nokia Dimensional Style)
            for (const p of platforms) {
                // 3D Block Side (Depth)
                ctx.fillStyle = '#64748b'; // darker side
                ctx.beginPath();
                ctx.moveTo(p.x, p.y + p.h);
                ctx.lineTo(p.x + 10, p.y + p.h + 10);
                ctx.lineTo(p.x + p.w + 10, p.y + p.h + 10);
                ctx.lineTo(p.x + p.w + 10, p.y + 10);
                ctx.lineTo(p.x + p.w, p.y);
                ctx.lineTo(p.x, p.y + p.h);
                ctx.fill();

                // Top Surface
                ctx.fillStyle = '#94a3b8'; // slate-400
                ctx.fillRect(p.x, p.y, p.w, p.h);

                // Brick pattern texture
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1;
                for (let i = p.x; i < p.x + p.w; i += 20) {
                    ctx.beginPath(); ctx.moveTo(i, p.y); ctx.lineTo(i, p.y + p.h); ctx.stroke();
                }
                for (let j = p.y; j < p.y + p.h; j += 20) {
                    ctx.beginPath(); ctx.moveTo(p.x, j); ctx.lineTo(p.x + p.w, j); ctx.stroke();
                }
            }

            // Draw Spikes
            ctx.fillStyle = '#ef4444'; // red-500
            for (const s of spikes) {
                const numSpikes = Math.floor(s.w / 20);
                const spikeWidth = s.w / numSpikes;
                ctx.beginPath();
                for (let i = 0; i < numSpikes; i++) {
                    ctx.moveTo(s.x + (i * spikeWidth), s.y + s.h);
                    ctx.lineTo(s.x + (i * spikeWidth) + (spikeWidth / 2), s.y);
                    ctx.lineTo(s.x + ((i + 1) * spikeWidth), s.y + s.h);
                }
                ctx.fill();
                ctx.strokeStyle = '#991b1b'; // red-800 outline
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw Rings
            ctx.strokeStyle = '#eab308'; // yellow-500
            ctx.lineWidth = 4;
            for (const r of rings) {
                if (!r.collected) {
                    ctx.beginPath();
                    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                    ctx.stroke();
                    // Inner highlight
                    ctx.strokeStyle = '#fef08a';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(r.x, r.y, r.radius - 2, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // Draw Ball (3D sphere effect)
            ctx.save();
            ctx.translate(ball.x, ball.y);
            // Spin calculation based on x pos
            ctx.rotate(ball.x * 0.05);
            
            const gradient = ctx.createRadialGradient(-ball.radius*0.3, -ball.radius*0.3, ball.radius*0.1, 0, 0, ball.radius);
            gradient.addColorStop(0, '#fca5a5'); // light red highlight
            gradient.addColorStop(0.7, '#ef4444'); // base red
            gradient.addColorStop(1, '#991b1b'); // dark shadow edge

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add a texture/line to the ball to show spinning
            ctx.strokeStyle = '#f87171';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, ball.radius - 4, 0, Math.PI);
            ctx.stroke();
            
            ctx.restore();

            ctx.restore(); // end camera translation
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
        };
    }, [isPlaying, gameOver, gameWon, currentLevel]);

    const startGame = () => {
        setScore(0);
        setGameOver(false);
        setGameWon(false);
        setCurrentLevel(0);
        setIsPlaying(true);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full outline-none p-4">
            <div className="mb-6 flex justify-between w-full max-w-[600px] items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 border-2 border-white">
                        <div className="w-4 h-4 bg-white/40 dark:bg-slate-900/40 rounded-full absolute -top-1 -left-1 mix-blend-overlay"></div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight leading-none">Nokia Bounce</h3>
                        <p className="text-sm font-bold text-red-500 uppercase tracking-widest mt-1">Level {currentLevel + 1}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-xl font-mono text-slate-800 dark:text-slate-200 font-bold">Score: <span className="text-red-600">{score}</span></p>
                </div>
            </div>

            <div className="relative border-4 border-slate-800 rounded-xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900" style={{ width: 600, height: 600 }}>
                <canvas 
                    ref={canvasRef}
                    width={600}
                    height={600}
                    className="block"
                />

                {!isPlaying && !gameOver && !gameWon && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-xl shadow-red-500/40 mb-6 flex items-center justify-center animate-bounce border-4 border-white relative overflow-hidden">
                             <div className="absolute top-2 left-4 w-8 h-8 bg-white/40 dark:bg-slate-900/40 rounded-full blur-[2px]"></div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-6">Ready to bounce?</h2>
                        <button onClick={startGame} className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full uppercase tracking-wider shadow-xl transition-all hover:scale-105 active:scale-95 text-lg">
                            Start Game
                        </button>
                    </div>
                )}
                
                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10 text-slate-900 dark:text-white">
                        <span className="text-6xl mb-4">💥</span>
                        <h2 className="text-4xl font-black text-red-600 mb-2">GAME OVER</h2>
                        <p className="text-xl mb-8 font-bold text-slate-600">You scored <span className="text-slate-900 dark:text-white text-2xl">{score}</span> points</p>
                        <button onClick={startGame} className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full uppercase tracking-wider shadow-xl transition-all hover:scale-105 active:scale-95 text-lg">
                            Try Again
                        </button>
                    </div>
                )}

                {gameWon && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-50/95 backdrop-blur-md z-10 text-slate-900 dark:text-white border border-emerald-200">
                        <span className="text-6xl mb-4">🏆</span>
                        <h2 className="text-4xl font-black text-emerald-600 mb-2">YOU WIN!</h2>
                        <p className="text-xl mb-8 font-bold text-slate-600">Perfect Score: <span className="text-slate-900 dark:text-white text-2xl">{score}</span> points</p>
                        <button onClick={startGame} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full uppercase tracking-wider shadow-xl transition-all hover:scale-105 active:scale-95 text-lg">
                            Play Again
                        </button>
                    </div>
                )}
            </div>
            
            <div className="mt-8 flex items-center gap-6">
                <div className="flex gap-2">
                    <kbd className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 border-b-4 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-lg">←</kbd>
                    <kbd className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 border-b-4 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-lg">→</kbd>
                </div>
                <span className="text-slate-500 dark:text-slate-400 font-medium">to move</span>
                
                <div className="w-px h-8 bg-slate-200"></div>

                <div className="flex gap-2 items-center">
                    <kbd className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 border-b-4 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-lg">↑</kbd>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">or</span>
                    <kbd className="px-4 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 border-b-4 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-sm uppercase">Space</kbd>
                </div>
                <span className="text-slate-500 dark:text-slate-400 font-medium">to jump</span>
            </div>
        </div>
    );
}
