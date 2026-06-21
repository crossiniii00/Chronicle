import React, { useState } from 'react';
import { BriefcaseMedical } from 'lucide-react';
import type { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import { MedicalDashboardModal } from './MedicalDashboardModal';

type Size = 'xs' | 'sm' | 'md' | 'lg';

interface MedicalIndicatorProps {
    application: Application;
    size?: Size;
    className?: string;
    showTooltip?: boolean;
}

const SIZE_CONFIG: Record<Size, { icon: number; pad: string }> = {
    xs: { icon: 9, pad: 'p-0.5' },
    sm: { icon: 10, pad: 'p-1' },
    md: { icon: 12, pad: 'p-1.5' },
    lg: { icon: 14, pad: 'p-2' },
};

export function MedicalIndicator({
    application,
    size = 'sm',
    className,
}: MedicalIndicatorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const pis = application.pis || {};
    const conditions = pis.medical_conditions || [];
    const notes = (pis.medical_history_notes || '').trim();
    const hasMeaningfulNotes = notes.length > 0 && notes.toLowerCase() !== 'none';
    const hasSicknessFlag = pis.has_medical_conditions === true;
    const hasRealCondition =
        conditions.length > 0 ||
        hasSicknessFlag ||
        hasMeaningfulNotes ||
        pis.smokes === true ||
        pis.drinks_alcohol === true ||
        pis.is_pregnant === true;

    if (!hasRealCondition) return null;

    const cfg = SIZE_CONFIG[size];

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(true);
                }}
                aria-label="View medical dashboard"
                className={cn(
                    'inline-flex items-center justify-center text-surface-900 bg-surface-900/10 hover:bg-surface-900/20 border border-surface-900/25 rounded-sm transition-all cursor-pointer hover:scale-110 active:scale-95 shrink-0',
                    cfg.pad,
                    className
                )}
            >
                <BriefcaseMedical size={cfg.icon} />
            </button>

            <MedicalDashboardModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                application={application}
            />
        </>
    );
}
