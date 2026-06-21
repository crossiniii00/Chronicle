import React, { useState } from 'react';
import type { Department } from '@/services/DepartmentService';
import { cn } from '@/utils/formatters';

interface AccountAvatarProps {
    department: Department;
    quota?: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AccountAvatar({ department, quota, size = 'md' }: AccountAvatarProps) {
    const sizeClass = size === 'xl' ? 'w-16 h-16 rounded-xl' : size === 'lg' ? 'w-12 h-12 rounded-xl' : size === 'sm' ? 'w-10 h-10 rounded-lg' : 'w-10 h-10 rounded-md';
    const [imgError, setImgError] = useState(false);

    const displayImage = !imgError && department.accountImageUrl ? department.accountImageUrl : department.accountImageData;

    return (
        <div className={cn(
            sizeClass,
            "flex items-center justify-center flex-shrink-0 overflow-hidden transition-all shadow-sm border border-surface-200 bg-white"
        )}>
            {displayImage ? (
                <img 
                    src={displayImage} 
                    alt={department.name} 
                    className="w-full h-full object-cover" 
                    onError={() => setImgError(true)}
                />
            ) : (
                <img src="/contactpoint-logo.png?v=2" alt="Logo" className="w-full h-full object-contain p-1" />
            )}
        </div>
    );
}
