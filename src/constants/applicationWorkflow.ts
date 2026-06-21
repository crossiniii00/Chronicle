import type { ApplicationStatus } from '@/types';

export type WorkflowStageId =
    | 'APPLICANT_FORM'
    | 'TYPING_TEST'
    | 'INITIAL_INTERVIEW'
    | 'ASSESSMENT'
    | 'FINAL_INTERVIEW'
    | 'FINAL_VERDICT';

export interface WorkflowStage {
    id: WorkflowStageId;
    label: string;
    description: string;
    statuses: ApplicationStatus[];
}

export const FINAL_VERDICT_STATUSES: ApplicationStatus[] = [
    'FINAL_VERDICT',
    'PASSED',
    'FAILED',
    'HIRED',
    'REJECTED',
    'WAITLISTED',
    'CONDITIONAL',
    'WITHDRAWN',
    'NOT_ELIGIBLE_FOR_REHIRE',
];

export const APPLICATION_WORKFLOW: WorkflowStage[] = [
    {
        id: 'APPLICANT_FORM',
        label: 'Applicant Form',
        description: 'Personal information sheet and resume submission.',
        statuses: ['APPLIED'],
    },
    {
        id: 'TYPING_TEST',
        label: 'Typing Test',
        description: 'Timed typing test with WPM and accuracy scoring.',
        statuses: ['TYPING_TEST'],
    },
    {
        id: 'INITIAL_INTERVIEW',
        label: 'Initial Interview',
        description: 'Queueing, room assignment, and first interview handling.',
        statuses: ['QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS', 'INITIAL_INTERVIEW'],
    },
    {
        id: 'ASSESSMENT',
        label: 'Assessment',
        description: 'Role-specific tests and recruiter evaluation.',
        statuses: ['ASSESSMENT'],
    },
    {
        id: 'FINAL_INTERVIEW',
        label: 'Ops Val Interview',
        description: 'Decision interview with hiring stakeholders.',
        statuses: ['FINAL_INTERVIEW'],
    },
    {
        id: 'FINAL_VERDICT',
        label: 'Final Verdict',
        description: 'Hiring decision and final applicant disposition.',
        statuses: FINAL_VERDICT_STATUSES,
    },
];

export function getWorkflowStage(status: ApplicationStatus): WorkflowStage {
    return APPLICATION_WORKFLOW.find((stage) => stage.statuses.includes(status)) ?? APPLICATION_WORKFLOW[0];
}

export function getWorkflowStepIndex(status: ApplicationStatus): number {
    return APPLICATION_WORKFLOW.findIndex((stage) => stage.statuses.includes(status));
}

export function isFinalVerdictStatus(status: ApplicationStatus): boolean {
    return FINAL_VERDICT_STATUSES.includes(status);
}
