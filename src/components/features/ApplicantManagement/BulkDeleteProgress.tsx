import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { LoadingScreen } from '@/components/common/LoadingScreen';

interface BulkDeleteProgressProps {
    isVisible: boolean;
    progress: number;
    totalCount: number;
}

export function BulkDeleteProgress({ isVisible, progress, totalCount }: BulkDeleteProgressProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <LoadingScreen message={`ELIMINATING ${totalCount} RECORDS (${progress}% COMPLETE)...`} />
            )}
        </AnimatePresence>
    );
}
