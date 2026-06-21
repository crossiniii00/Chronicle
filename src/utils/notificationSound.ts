let cachedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctor) return null;
    if (!cachedCtx) {
        try {
            cachedCtx = new Ctor();
        } catch {
            return null;
        }
    }
    if (cachedCtx.state === 'suspended') {
        cachedCtx.resume().catch(() => {});
    }
    return cachedCtx;
}

function playTone(ctx: AudioContext, freq: number, startAt: number, durationMs: number, peakGain = 0.18) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startAt);

    const t0 = startAt;
    const t1 = startAt + durationMs / 1000;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
}

export function playNotificationSound() {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    playTone(ctx, 880, now, 140, 0.16);
    playTone(ctx, 1320, now + 0.12, 180, 0.12);
}
