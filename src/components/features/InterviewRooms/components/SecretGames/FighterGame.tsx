import React, { useEffect, useRef, useState } from 'react';

const STAGES = [
    { name: 'Stage 1: Rookie', hp: 50, speed: 1.5, attackCooldown: 60, color: '#94a3b8' },
    { name: 'Stage 2: Brawler', hp: 100, speed: 2, attackCooldown: 40, color: '#f59e0b' },
    { name: 'Stage 3: Champion', hp: 150, speed: 3, attackCooldown: 30, color: '#ef4444' },
    { name: 'Final Boss', hp: 200, speed: 4, attackCooldown: 20, color: '#000000' }
];

export function FighterGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStage, setCurrentStage] = useState(0);

    // State for UI health bars
    const [p1Health, setP1Health] = useState(100);
    const [p2Health, setP2Health] = useState(100);

    useEffect(() => {
        if (!isPlaying || gameOver || gameWon) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        
        const stageData = STAGES[currentStage];

        // Fighter objects
        const p1 = { x: 100, y: 250, width: 40, height: 80, speed: 4, maxHp: 100, hp: p1Health, color: '#3b82f6', isAttacking: false, attackCooldown: 0, facing: 1 };
        const p2 = { x: 360, y: 250, width: 40, height: 80, speed: stageData.speed, maxHp: stageData.hp, hp: p2Health, color: stageData.color, isAttacking: false, attackCooldown: 0, facing: -1 };

        const groundY = 330;

        const keys: { [key: string]: boolean } = {};
        const handleKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const checkCollision = (rect1: any, rect2: any) => {
            return (
                rect1.x < rect2.x + rect2.width &&
                rect1.x + rect1.width > rect2.x &&
                rect1.y < rect2.y + rect2.height &&
                rect1.y + rect1.height > rect2.y
            );
        };

        const update = () => {
            // Cooldowns
            if (p1.attackCooldown > 0) p1.attackCooldown--;
            if (p2.attackCooldown > 0) p2.attackCooldown--;

            // Facing direction
            p1.facing = p1.x < p2.x ? 1 : -1;
            p2.facing = p2.x < p1.x ? 1 : -1;

            // Player 1 Movement
            if (keys['ArrowLeft'] && p1.x > 0) p1.x -= p1.speed;
            if (keys['ArrowRight'] && p1.x + p1.width < canvas.width) p1.x += p1.speed;

            // Player 1 Attack
            if (keys['Space'] && p1.attackCooldown === 0) {
                p1.isAttacking = true;
                p1.attackCooldown = 25; // frames
                
                // Attack hitbox
                const attackBox = { x: p1.x + p1.width, y: p1.y + 20, width: 40, height: 20 };
                if (p1.facing === -1) {
                    attackBox.x = p1.x - 40;
                }

                if (checkCollision(attackBox, p2)) {
                    p2.hp -= 10;
                    setP2Health(p2.hp);
                }
            } else {
                p1.isAttacking = p1.attackCooldown > 15; // Visual attack frame duration
            }

            // Simple AI for Player 2
            const dist = Math.abs(p1.x - p2.x);
            if (dist > 60) {
                // Move towards player
                if (p2.x > p1.x) p2.x -= p2.speed;
                else p2.x += p2.speed;
            } else {
                // In range, attack randomly
                if (p2.attackCooldown === 0 && Math.random() < 0.05) {
                    p2.isAttacking = true;
                    p2.attackCooldown = stageData.attackCooldown;

                    const attackBox = { x: p2.x - 40, y: p2.y + 20, width: 40, height: 20 };
                    if (p2.facing === 1) attackBox.x = p2.x + p2.width;

                    if (checkCollision(attackBox, p1)) {
                        p1.hp -= 10;
                        setP1Health(p1.hp);
                    }
                }
            }
            p2.isAttacking = p2.attackCooldown > (stageData.attackCooldown - 10);

            // Bounds for p2
            if (p2.x < 0) p2.x = 0;
            if (p2.x + p2.width > canvas.width) p2.x = canvas.width - p2.width;

            // Prevent walking through each other completely
            if (dist < 30) {
                if (p1.x < p2.x) {
                    p1.x -= p1.speed;
                    p2.x += p2.speed;
                } else {
                    p1.x += p1.speed;
                    p2.x -= p2.speed;
                }
            }

            // Win condition
            if (p1.hp <= 0) {
                setWinner('enemy');
                setGameOver(true);
            } else if (p2.hp <= 0) {
                if (currentStage < STAGES.length - 1) {
                    setCurrentStage(s => s + 1);
                    setP2Health(STAGES[currentStage + 1].hp);
                    p2.hp = STAGES[currentStage + 1].hp; // Reset for next loop
                    
                    // Reset positions slightly
                    p1.x = 100;
                    p2.x = 360;
                } else {
                    setWinner('player');
                    setGameWon(true);
                }
            }
        };

        const drawCharacter = (char: any) => {
            const { x, y, width, height, color, isAttacking, facing } = char;
            
            // Draw shadow
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.ellipse(x + width/2, y + height, 25, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = color;
            ctx.lineWidth = 4;
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Head
            ctx.beginPath();
            ctx.arc(x + width/2, y + 15, 12, 0, Math.PI * 2);
            ctx.fill();

            // Torso
            ctx.beginPath();
            ctx.moveTo(x + width/2, y + 25);
            ctx.lineTo(x + width/2, y + 55);
            ctx.stroke();

            // Legs
            ctx.beginPath();
            ctx.moveTo(x + width/2, y + 55);
            // left leg
            ctx.lineTo(x + width/2 - 15, y + 80);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x + width/2, y + 55);
            // right leg
            ctx.lineTo(x + width/2 + 15, y + 80);
            ctx.stroke();

            // Arms
            ctx.beginPath();
            ctx.moveTo(x + width/2, y + 35); // shoulder
            if (isAttacking) {
                // Punching arm
                ctx.lineTo(x + width/2 + (40 * facing), y + 35);
                ctx.stroke();
                
                // Attack effect
                ctx.fillStyle = 'rgba(255,0,0,0.5)';
                ctx.beginPath();
                ctx.arc(x + width/2 + (40 * facing), y + 35, 10, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Idle arms
                ctx.lineTo(x + width/2 + (15 * facing), y + 45); // elbow
                ctx.lineTo(x + width/2 + (20 * facing), y + 30); // hand up
                ctx.stroke();
            }

            // Back arm (simple)
            ctx.beginPath();
            ctx.moveTo(x + width/2, y + 35);
            ctx.lineTo(x + width/2 - (10 * facing), y + 45);
            ctx.stroke();
            
            // Re-set for next draws
            ctx.lineCap = 'butt';
        };

        const draw = () => {
            // Light Theme background
            ctx.fillStyle = '#f8fafc'; // slate-50
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Ground
            ctx.fillStyle = '#e2e8f0'; // slate-200
            ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(0, groundY, canvas.width, 3); // top border of ground

            drawCharacter(p1);
            drawCharacter(p2);
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
    }, [isPlaying, gameOver, gameWon, currentStage]);

    const startGame = () => {
        setP1Health(100);
        setP2Health(STAGES[0].hp);
        setCurrentStage(0);
        setWinner(null);
        setGameOver(false);
        setGameWon(false);
        setIsPlaying(true);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full outline-none w-full max-w-[600px]">
            <div className="mb-2 w-full text-center">
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">{STAGES[currentStage]?.name || 'Fighter'}</h2>
            </div>
            <div className="mb-6 flex justify-between w-full max-w-[500px]">
                <div className="flex flex-col w-[200px]">
                    <span className="text-blue-600 font-bold mb-1 text-sm uppercase tracking-wider">Player</span>
                    <div className="w-full bg-slate-200 h-4 rounded-sm overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${Math.max(0, (p1Health / 100) * 100)}%` }} />
                    </div>
                </div>
                <div className="flex flex-col w-[200px] items-end">
                    <span className="text-red-600 font-bold mb-1 text-sm uppercase tracking-wider">CPU</span>
                    <div className="w-full bg-slate-200 h-4 rounded-sm flex justify-end overflow-hidden">
                        <div className="bg-red-500 h-full transition-all" style={{ width: `${Math.max(0, (p2Health / (STAGES[currentStage]?.hp || 100)) * 100)}%` }} />
                    </div>
                </div>
            </div>

            <div className="relative" style={{ width: 500, height: 400 }}>
                <canvas 
                    ref={canvasRef}
                    width={500}
                    height={400}
                    className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-lg shadow-sm"
                />

                {!isPlaying && !gameOver && !gameWon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 rounded-lg">
                        <button onClick={startGame} className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-md uppercase tracking-wider shadow-md transition-transform hover:scale-105 active:scale-95">
                            Start Game
                        </button>
                    </div>
                )}
                
                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 text-slate-900 dark:text-white rounded-lg">
                        <h2 className={`text-4xl font-black mb-2 uppercase ${winner === 'player' ? 'text-blue-600' : 'text-red-600'}`}>
                            {winner === 'player' ? 'You Win!' : 'You Lose!'}
                        </h2>
                        <button onClick={startGame} className="mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-md uppercase tracking-wider shadow-md transition-transform hover:scale-105 active:scale-95">
                            Try Again
                        </button>
                    </div>
                )}

                {gameWon && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-50/95 backdrop-blur-sm z-10 text-slate-900 dark:text-white rounded-lg border border-emerald-200">
                        <h2 className="text-4xl font-black mb-2 uppercase text-emerald-600">
                            CHAMPION!
                        </h2>
                        <p className="text-lg mb-6 font-bold text-slate-700 dark:text-slate-300">You beat all stages!</p>
                        <button onClick={startGame} className="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md uppercase tracking-wider shadow-md transition-transform hover:scale-105 active:scale-95">
                            Play Again
                        </button>
                    </div>
                )}
            </div>
            
            <div className="mt-6 text-slate-500 dark:text-slate-400 text-sm text-center">
                Use <kbd className="bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded mx-1 shadow-sm text-slate-700 dark:text-slate-300 font-mono text-xs">Left/Right</kbd> to move.<br/>
                Press <kbd className="bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded mx-1 mt-2 inline-block shadow-sm text-slate-700 dark:text-slate-300 font-mono text-xs">Space</kbd> to punch.
            </div>
        </div>
    );
}
