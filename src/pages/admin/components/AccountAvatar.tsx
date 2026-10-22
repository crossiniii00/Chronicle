import React, { useState } from 'react';
import type { Department } from '@/services/DepartmentService';
import { cn } from '@/utils/formatters';

interface AccountAvatarProps {
    department: Department;
    quota?: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AccountAvatar({ department, quota, size = 'md' }: AccountAvatarProps) {
    const sizeClass = size === 'xl' ? 'w-16 h-16 rounded-none' : size === 'lg' ? 'w-12 h-12 rounded-none' : size === 'sm' ? 'w-10 h-10 rounded-none' : 'w-10 h-10 rounded-none';
    const [imgError, setImgError] = useState(false);

    const resolvedUrl = department.accountImageUrl
        ? (department.accountImageUrl.startsWith('/') ? `/api${department.accountImageUrl}` : department.accountImageUrl)
        : null;

    const displayImage = !imgError && resolvedUrl ? resolvedUrl : department.accountImageData;

    return (
        <div className={cn(
            sizeClass,
            "flex items-center justify-center flex-shrink-0 overflow-hidden transition-all shadow-sm border border-surface-200 bg-white dark:bg-slate-900"
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
