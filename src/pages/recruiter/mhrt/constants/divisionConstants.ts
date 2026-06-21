import type { DivisionMapping } from '@/services/MhrtService';

export const MAPPING_DATA: DivisionMapping[] = [
    {
        id: '1',
        division: 'Operations Direct',
        assignedRoles: 'Agents'
    },
    {
        id: '2',
        division: 'Operations Support',
        assignedRoles: 'TL, TM, OM, Site Director, Directors'
    },
    {
        id: '3',
        division: 'Operations Services',
        assignedRoles: 'Trainers, QA, WFM'
    },
    {
        id: '4',
        division: 'Shared Services',
        assignedRoles: 'IT, Finance, HR, Admin, Finance, Facilities'
    }
];
