import type { Application } from '@/types/application';

export function isRoutedToSpecializedRecruiter(_applicant: Application): boolean {
    return false;
}

export function getEndorsedOvBadgeLabel(applicant: Application): string | null {
    const endorsedOv =
        applicant.assigned_ops_validator_name ||
        applicant.metadata?.assigned_ops_validator_name ||
        applicant.pis?.ops_validator_email ||
        '';
    const specializedRecruiter = isRoutedToSpecializedRecruiter(applicant) ? 'Recruiter S!' : '';

    if (endorsedOv && specializedRecruiter) return `OV: ${endorsedOv} • ${specializedRecruiter}`;
    if (endorsedOv) return `OV: ${endorsedOv}`;
    if (specializedRecruiter) return `Rerouted: ${specializedRecruiter}`;

    return null;
}
