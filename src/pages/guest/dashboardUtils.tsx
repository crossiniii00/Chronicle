import React, { useState, useEffect } from 'react';
import type { Application } from '@/types/application';

export function checkValidatorAssignment(app: Application, authUser: any) {
    return true;
}

export function AnimatedNumber({ value }: { value: number | string }) {
    const isPercent = typeof value === 'string' && value.endsWith('%');
    const numericVal = typeof value === 'number' ? value : parseInt(value) || 0;
    const [displayVal, setDisplayVal] = useState(0);

    useEffect(() => {
        const start = 0;
        const end = numericVal;
        if (start === end) {
            setDisplayVal(end);
            return;
        }
        const duration = 0.5; // seconds
        const startTime = performance.now();
        
        let animationFrameId: number;
        const update = (now: number) => {
            const elapsed = (now - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const ease = progress * (2 - progress); // easeOutQuad
            const current = Math.round(start + (end - start) * ease);
            setDisplayVal(current);
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(update);
            }
        };
        animationFrameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationFrameId);
    }, [numericVal]);

    return <span>{displayVal}{isPercent ? '%' : ''}</span>;
}
