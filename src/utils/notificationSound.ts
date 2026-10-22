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
    if (typeof window !== 'undefined') {
        const isMuted = localStorage.getItem('chronicle_notifications_muted') === 'true';
        const isDisabled = localStorage.getItem('chronicle_notifications_disabled') === 'true';
        if (isMuted || isDisabled) return;
    }
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    // A comfy pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
}

export function playEditSound() {
    if (typeof window !== 'undefined') {
        const isMuted = localStorage.getItem('chronicle_notifications_muted') === 'true';
        const isDisabled = localStorage.getItem('chronicle_notifications_disabled') === 'true';
        if (isMuted || isDisabled) return;
    }
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    // A soft UI click/tick
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
}
