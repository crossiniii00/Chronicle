import React from 'react';
import { ApplicantManagement } from '../ApplicantManagement';

export function InactiveView({ hideHeader = false }: { hideHeader?: boolean }) {
    return <ApplicantManagement initialTab="rejected" mode="full" initialStatusFilter="INACTIVE" />;
}
