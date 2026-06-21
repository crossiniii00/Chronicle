import React from 'react';
import { Outlet } from 'react-router-dom';

export function MHRTView() {
    return (
        <div className="animate-fade-in max-w-full mx-auto pb-4 pt-2 px-2">
            {/* Content Area - Minimized spacing */}
            <div className="relative min-h-screen">
                <Outlet />
            </div>
        </div>
    );
}
