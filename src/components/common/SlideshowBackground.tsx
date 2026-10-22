import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const images = [
    '/assets/backgrounds/bg1.jpg',
    '/assets/backgrounds/bg2.jpg',
    '/assets/backgrounds/bg3.jpg',
    '/assets/backgrounds/bg4.png',
    '/assets/backgrounds/bg5.jpg',
    '/assets/backgrounds/bg6.png',
    '/assets/backgrounds/bg7.png',
];

export function SlideshowBackground() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 6000); // Change image every 6 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-black">
            <AnimatePresence initial={false}>
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "linear" }}
                    className="absolute inset-0"
                >
                    <div 
                        className="w-full h-full bg-cover bg-center bg-no-repeat blur-[6px] scale-110"
                        style={{ backgroundImage: `url(${images[currentIndex]})` }}
                    />
                    {/* Dark Overlay */}
                    <div className="absolute inset-0 bg-black/50" />
                </motion.div>
            </AnimatePresence>

            {/* Enhanced Film Grain Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.12] mix-blend-overlay z-10">
                <svg width="100%" height="100%" className="opacity-90">
                    <filter id="grainy">
                        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="4" stitchTiles="stitch" />
                        <feColorMatrix type="saturate" values="0" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#grainy)" />
                </svg>
            </div>

            {/* Static Grain Overlay (Secondary for sharpness) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] z-11" />

            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.7)] z-20" />

            {/* Subtle Rain Effect */}
            <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden opacity-10">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute bg-white/30 dark:bg-slate-900/30 w-[1px] h-[30px]"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `-${Math.random() * 100}px`,
                            animation: `fall ${0.4 + Math.random() * 0.4}s linear infinite`,
                            animationDelay: `${Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            {/* Blowing Leaves Effect */}
            <div className="absolute inset-0 pointer-events-none z-16 overflow-hidden">
                {[...Array(40)].map((_, i) => {
                    const colors = ['#5a7d33', '#a65d2e', '#d4a373', '#606c38', '#f4a261'];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const size = 14 + Math.random() * 12;
                    return (
                        <div
                            key={i}
                            className="absolute rounded-[60%_20%_60%_20%] opacity-80 shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                            style={{
                                width: `${size}px`,
                                height: `${size * 0.6}px`,
                                backgroundColor: color,
                                left: `-100px`,
                                top: `${Math.random() * 100}%`,
                                animation: `blow ${3 + Math.random() * 5}s linear infinite, sway ${1 + Math.random() * 2}s ease-in-out infinite`,
                                animationDelay: `${Math.random() * 10}s`
                            }}
                        />
                    );
                })}
            </div>

            {/* Special Effect: Cinematic Light Leaks */}
            <div className="absolute inset-0 pointer-events-none z-17 overflow-hidden mix-blend-screen opacity-30">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(255,165,0,0.15)_0%,transparent_60%)] animate-sweep" />
                <div className="absolute top-[-20%] right-[-20%] w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,rgba(0,120,212,0.1)_0%,transparent_70%)] animate-pulse-slow" />
            </div>

            <style>{`
                @keyframes fall {
                    to { transform: translateY(110vh); }
                }
                @keyframes blow {
                    0% { transform: translateX(0) translateY(0) rotate(0deg); }
                    100% { transform: translateX(calc(100vw + 200px)) translateY(150px) rotate(1080deg); }
                }
                @keyframes sway {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(40px) rotate(30deg); }
                }
                @keyframes sweep {
                    0% { transform: translate(-10%, -10%) rotate(0deg); }
                    100% { transform: translate(10%, 10%) rotate(360deg); }
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
}
