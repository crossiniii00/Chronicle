import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, ChevronRight } from 'lucide-react';

interface SpotlightDetail {
    target: string;
    message?: string | null;
    durationMs?: number;
}

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const SPOTLIGHT_EVENT = 'ai-spotlight';

function findTarget(target: string): HTMLElement | null {
    if (!target) return null;
    const safe = target.replace(/[^\w\s\[\]\-=#."':]/g, '');
    if (!safe) return null;
    try {
        const el = document.querySelector<HTMLElement>(safe);
        if (el) return el;
    } catch {
        // invalid selector — fall through
    }
    return (
        document.querySelector<HTMLElement>(`[data-ai-spotlight="${target}"]`) ||
        document.querySelector<HTMLElement>(`[data-ai-spotlight-id="${target}"]`) ||
        document.querySelector<HTMLElement>(`#${target}`) ||
        document.querySelector<HTMLElement>(`[name="${target}"]`)
    );
}

function getRect(el: HTMLElement): Rect {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function SpotlightOverlay() {
    const [active, setActive] = useState<SpotlightDetail | null>(null);
    const [rect, setRect] = useState<Rect | null>(null);
    const dismissTimerRef = useRef<number | null>(null);
    const retryTimerRef = useRef<number | null>(null);

    const dismiss = useCallback(() => {
        if (dismissTimerRef.current) {
            window.clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = null;
        }
        if (retryTimerRef.current) {
            window.clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        setActive(null);
        setRect(null);
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as SpotlightDetail | undefined;
            if (!detail?.target) return;
            setActive(detail);

            const tryFind = (attempt: number) => {
                const el = findTarget(detail.target);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    setTimeout(() => {
                        const r = getRect(el);
                        setRect(r);
                    }, 350);
                    if (detail.durationMs && detail.durationMs > 0) {
                        if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
                        dismissTimerRef.current = window.setTimeout(dismiss, detail.durationMs);
                    }
                } else if (attempt < 8) {
                    retryTimerRef.current = window.setTimeout(() => tryFind(attempt + 1), 200);
                } else {
                    dismiss();
                }
            };
            tryFind(0);
        };
        window.addEventListener(SPOTLIGHT_EVENT, handler);
        return () => {
            window.removeEventListener(SPOTLIGHT_EVENT, handler);
            if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
            if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
        };
    }, [dismiss]);

    useEffect(() => {
        if (!active) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') dismiss();
        };
        window.addEventListener('keydown', onKey);
        const onResize = () => {
            const el = findTarget(active.target);
            if (el) setRect(getRect(el));
        };
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onResize, true);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onResize, true);
        };
    }, [active, dismiss]);

    if (!active) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="spotlight-root"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[10002] pointer-events-none"
            >
                <div
                    className="absolute inset-0 pointer-events-auto"
                    style={{ background: 'transparent' }}
                    onClick={dismiss}
                />

                {rect && <SpotlightHole rect={rect} />}

                {rect && <ArrowIndicator rect={rect} message={active.message} onDismiss={dismiss} />}
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

function SpotlightHole({ rect }: { rect: Rect }) {
    const pad = 6;
    const hole = {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
    };
    return (
        <>
            <div
                className="absolute inset-0"
                style={{
                    background: 'rgba(15, 25, 65, 0.55)',
                    clipPath: `polygon(
                        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                        ${hole.left}px ${hole.top}px,
                        ${hole.left + hole.width}px ${hole.top}px,
                        ${hole.left + hole.width}px ${hole.top + hole.height}px,
                        ${hole.left}px ${hole.top + hole.height}px,
                        ${hole.left}px ${hole.top}px
                    )`,
                }}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute pointer-events-none"
                style={{
                    top: hole.top,
                    left: hole.left,
                    width: hole.width,
                    height: hole.height,
                    boxShadow: '0 0 0 3px #0078d4, 0 0 0 6px rgba(0, 120, 212, 0.35), 0 0 24px 8px rgba(0, 120, 212, 0.55)',
                    borderRadius: 6,
                    background: 'transparent',
                }}
            />
        </>
    );
}

function ArrowIndicator({ rect, message, onDismiss }: { rect: Rect; message?: string | null; onDismiss: () => void }) {
    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    const placeBelow = spaceBelow > 110;
    const arrowTop = placeBelow ? rect.top + rect.height + 12 : rect.top - 12 - 40;
    const arrowLeft = rect.left + rect.width / 2;
    const rotation = placeBelow ? 180 : 0;

    const bubbleTop = placeBelow ? arrowTop + 24 : arrowTop - 60;
    const bubbleLeft = Math.max(12, Math.min(window.innerWidth - 360, arrowLeft - 160));

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: placeBelow ? -8 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 360, damping: 22 }}
                className="absolute pointer-events-none"
                style={{ top: arrowTop, left: arrowLeft - 14, transform: `rotate(${rotation}deg)` }}
            >
                <motion.svg
                    width={28}
                    height={40}
                    viewBox="0 0 28 40"
                    fill="none"
                    animate={{ y: [0, placeBelow ? 4 : -4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                >
                    <defs>
                        <linearGradient id="arrowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0078d4" />
                            <stop offset="100%" stopColor="#1e3a8a" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M14 0 L14 32 M2 22 L14 38 L26 22"
                        stroke="url(#arrowGrad)"
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />
                </motion.svg>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: placeBelow ? -6 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 340, damping: 24 }}
                className="absolute pointer-events-auto"
                style={{ top: bubbleTop, left: bubbleLeft, width: 320 }}
            >
                <div className="bg-white border border-[#0078d4]/30 rounded-lg shadow-2xl overflow-hidden">
                    <div className="flex items-start gap-2 px-3.5 py-2.5 bg-gradient-to-r from-[#0f1941] to-[#0078d4] text-white">
                        <ChevronRight size={14} className="shrink-0 mt-0.5" />
                        <p className="text-[12px] leading-snug font-medium min-w-0 flex-1">
                            {message || "Here's what you're looking for 👇"}
                        </p>
                        <button
                            onClick={onDismiss}
                            className="shrink-0 p-0.5 rounded hover:bg-white/15 transition-colors"
                            title="Dismiss (Esc)"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
