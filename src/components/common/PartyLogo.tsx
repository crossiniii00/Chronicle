import React, { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PartyLogoProps {
    src: string;
    alt: string;
    className?: string;
    /** Number of embers in the click burst (default 42) */
    burstCount?: number;
    /** Outer ring + glow color (default brand red) */
    accentColor?: string;
}

/**
 * Reusable logo wrapper that:
 * - Scales/tilts on hover with a pulsing radial glow + rotating conic ring
 * - Has a continuous ambient "ember" field drifting up around the logo
 * - Bursts a bright conflagration of rising embers on click
 *
 * Self-contained — no external state, no layout assumptions.
 */
export function PartyLogo({ src, alt, className = '', burstCount = 42, accentColor = '#ef3e36' }: PartyLogoProps) {
    const [burst, setBurst] = useState<Array<{ id: number; color: string; startX: number; rise: number; drift: number; size: number; delay: number; duration: number; peakOpacity: number }>>([]);
    const [isHovered, setIsHovered] = useState(false);
    const burstSeq = useRef(0);

    // Hot ember palette — skews toward warm (red/orange/yellow/white) with rare
    // cool sparks (cyan/violet) for visual interest, like real fire embers.
    const emberPalette = useMemo(() => [
        '#ffffff', '#ffffff', // white-hot core
        '#ef3e36', '#ef3e36', // brand red
        '#ff6b35', '#ff6b35', // orange
        '#fbbf24', '#fbbf24', // amber
        '#fde68a', // pale yellow
        '#f472b6', // rare pink spark
        '#22d3ee', // rare cyan spark
        '#a78bfa', // rare violet spark
    ], []);

    // Continuous ambient embers — generated once, loop forever with their
    // own delays/durations so the field looks organic, not synchronized.
    const ambientEmbers = useMemo(() => {
        const count = 14;
        return Array.from({ length: count }, (_, i) => {
            // Start positions spread horizontally across the logo width
            // Drift range stays inside the wrapper so nothing flies off-screen
            const startX = (i / count) * 100 - 10; // % offset
            const rise = 90 + Math.random() * 80; // px upward
            const drift = (Math.random() - 0.5) * 40; // lateral wobble range
            const size = 2 + Math.random() * 3;
            const color = emberPalette[Math.floor(Math.random() * emberPalette.length)];
            const delay = Math.random() * 4;
            const duration = 2.5 + Math.random() * 2.5;
            const peakOpacity = 0.35 + Math.random() * 0.35;
            return { id: i, color, startX, rise, drift, size, delay, duration, peakOpacity };
        });
    }, [emberPalette]);

    const triggerPixelBurst = useCallback(() => {
        const seq = ++burstSeq.current;
        const newEmbers = Array.from({ length: burstCount }, (_, i) => {
            // Start positions across the bottom of the logo, slightly randomized
            const startX = (Math.random() - 0.5) * 100; // px from center
            // Rise distance: most go up, a few go slightly down-then-up
            const rise = -(120 + Math.random() * 160);
            // Lateral drift via sine-wave-like offset (mid-flight)
            const drift = (Math.random() - 0.5) * 80;
            // Size: mix of small sparks and a few larger embers
            const size = Math.random() < 0.85 ? 2 + Math.random() * 3 : 4 + Math.random() * 4;
            const color = emberPalette[Math.floor(Math.random() * emberPalette.length)];
            // Slight delay per ember so they don't all ignite at the exact same ms
            const delay = Math.random() * 0.18;
            // Duration: 1.2–2.2s; slower = looks heavier/lazier, faster = sparky
            const duration = 1.2 + Math.random() * 1.0;
            const peakOpacity = 0.75 + Math.random() * 0.25;
            return { id: seq * 1000 + i, color, startX, rise, drift, size, delay, duration, peakOpacity };
        });
        setBurst(newEmbers);
        window.setTimeout(() => {
            // Only clear if this is still the current burst
            setBurst(prev => (prev[0]?.id === newEmbers[0].id ? [] : prev));
        }, 2600);
    }, [burstCount, emberPalette]);

    return (
        <div
            className="relative inline-block select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={triggerPixelBurst}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') triggerPixelBurst(); }}
        >
            {/* The logo — bouncy hover scale + tilt + tap feedback.
                className is applied to the img so it gets sized correctly
                (the wrapper sizes to the image's natural rendered size). */}
            <motion.div
                animate={{
                    scale: isHovered ? 1.1 : 1,
                    rotate: isHovered ? -3 : 0,
                }}
                whileTap={{ scale: 0.92, rotate: 6 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                className="relative cursor-pointer"
                style={{ transformOrigin: 'center' }}
            >
                <motion.img
                    src={src}
                    alt={alt}
                    className={`relative z-10 object-contain ${className}`}
                    animate={isHovered
                        ? { filter: `drop-shadow(0 0 12px ${accentColor}88) drop-shadow(0 8px 16px rgba(0,0,0,0.4))` }
                        : { filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
                    transition={{ duration: 0.3 }}
                />
            </motion.div>

            {/* Ambient ember field — always on, soft, low-opacity rising embers */}
            <div className="absolute inset-0 overflow-visible pointer-events-none z-20">
                {ambientEmbers.map(e => (
                    <motion.span
                        key={`ambient-${e.id}`}
                        aria-hidden
                        className="absolute"
                        style={{
                            left: `${50 + e.startX}%`,
                            bottom: '15%',
                            width: `${e.size}px`,
                            height: `${e.size}px`,
                            backgroundColor: e.color,
                            borderRadius: '50%',
                            boxShadow: `0 0 ${e.size * 2}px ${e.size}px ${e.color}80, 0 0 ${e.size * 4}px ${e.color}40`,
                        }}
                        initial={{ y: 0, x: 0, opacity: 0, scale: 0.3 }}
                        animate={{
                            y: -e.rise,
                            x: [0, e.drift * 0.4, -e.drift * 0.3, e.drift * 0.2, 0],
                            opacity: [0, e.peakOpacity, e.peakOpacity * 0.7, 0],
                            scale: [0.3, 1, 0.9, 0.2],
                        }}
                        transition={{
                            duration: e.duration,
                            delay: e.delay,
                            repeat: Infinity,
                            repeatDelay: Math.random() * 1.5,
                            ease: 'easeOut',
                            times: [0, 0.2, 0.6, 1],
                        }}
                    />
                ))}
            </div>

            {/* Click burst — intense conflagration of rising embers */}
            <div className="absolute inset-0 overflow-visible pointer-events-none z-30">
                <AnimatePresence>
                    {burst.map(e => (
                        <motion.span
                            key={`burst-${e.id}`}
                            aria-hidden
                            className="absolute"
                            style={{
                                left: '50%',
                                bottom: '10%',
                                width: `${e.size}px`,
                                height: `${e.size}px`,
                                backgroundColor: e.color,
                                borderRadius: '50%',
                                boxShadow: `0 0 ${e.size * 1.5}px ${e.size * 0.8}px ${e.color}, 0 0 ${e.size * 3}px ${e.color}80, 0 0 ${e.size * 5}px ${e.color}30`,
                            }}
                            initial={{ y: 0, x: 0, opacity: 1, scale: 0.3 }}
                            animate={{
                                y: e.rise,
                                x: [0, e.drift * 0.5, -e.drift * 0.4, e.drift * 0.3, e.drift * 0.1],
                                opacity: [0, e.peakOpacity, e.peakOpacity * 0.8, 0],
                                scale: [0.3, 1.4, 1, 0.2],
                            }}
                            transition={{
                                duration: e.duration,
                                delay: e.delay,
                                ease: [0.16, 0.68, 0.42, 1],
                                times: [0, 0.15, 0.6, 1],
                            }}
                            exit={{ opacity: 0 }}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
