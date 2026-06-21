import React from 'react';
import { Outlet } from 'react-router-dom';

export function InterviewManagementView() {
    return (
        <div className="space-y-4 animate-fade-in max-w-full mx-auto pb-12">
            <div className="relative min-h-[600px] bg-white border border-surface-200 p-4 rounded-lg shadow-sm">
                <Outlet />
            </div>
        </div>
    );
}
