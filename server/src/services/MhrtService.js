import { MhrtRepository } from '../repositories/MhrtRepository.js';

export class MhrtService {
    static accountMap = {
        account: 'account', lob: 'lob', pseudonym: 'pseudonym', position: 'position',
        campaignManager: 'campaign_manager', teamManager: 'team_manager',
        baseSalary: 'base_salary', allowance: 'allowance', 
        accountSpecificTracker: 'account_specific_tracker', assessments: 'assessments',
        jobDescription: 'job_description', rosterLock: 'roster_lock', 
        toolTesting: 'tool_testing', hoops: 'hoops', voiceType: 'voice_type',
        direction: 'direction', vertical: 'vertical', education: 'education',
        workExperience: 'work_experience', typingSpeed: 'typing_speed',
        typingAccuracy: 'typing_accuracy', cefr: 'cefr', ase: 'ase',
        ovStatus: 'ov_status', opsValidator: 'ops_validator',
        ovAvailability: 'ov_availability', clientAvailability: 'client_availability',
        location: 'location', operationsDirector: 'operations_director',
        trainer: 'trainer', wfm_poc: 'wfm_poc', wfmPoc: 'wfm_poc',
        finalInterviewSchedule: 'final_interview_schedule', mustHaves: 'must_haves',
        niceToHaves: 'nice_to_haves', hmo: 'hmo', relocation: 'relocation',
        demographics: 'demographics', backgroundInvestigation: 'background_investigation'
    };

    static h2rMap = {
        account: 'account', lob: 'lob', jobLocation: 'job_location',
        division: 'division', lineOfBusiness: 'line_of_business',
        department: 'department', reportsTo: 'reports_to',
        training: 'training', nesting: 'nesting'
    };

    static mapFields(data, map) {
        const mapped = {};
        Object.entries(data).forEach(([key, val]) => {
            if (map[key]) {
                mapped[map[key]] = val;
            } else if (Object.values(map).includes(key)) {
                // If it's already snake_case, keep it
                mapped[key] = val;
            }
        });
        return mapped;
    }

    // Master Accounts
    static async createAccount(data) {
        const mapped = this.mapFields(data, this.accountMap);
        if (mapped.ov_status === undefined) mapped.ov_status = 'Pending';
        return await MhrtRepository.createAccount(mapped);
    }

    static async updateAccount(id, data) {
        const mapped = this.mapFields(data, this.accountMap);
        return await MhrtRepository.updateAccount(id, mapped);
    }

    // H2R Records
    static async createH2R(data) {
        const mapped = this.mapFields(data, this.h2rMap);
        return await MhrtRepository.createH2R(mapped);
    }

    static async updateH2R(id, data) {
        const mapped = this.mapFields(data, this.h2rMap);
        return await MhrtRepository.updateH2R(id, mapped);
    }

    // Divisions
    static async createDivision(data) {
        const mapped = {
            division: data.division,
            assigned_roles: data.assignedRoles
        };
        return await MhrtRepository.createDivision(mapped);
    }

    static async updateDivision(id, data) {
        const mapped = {};
        if (data.division !== undefined) mapped.division = data.division;
        if (data.assignedRoles !== undefined) mapped.assigned_roles = data.assignedRoles;
        return await MhrtRepository.updateDivision(id, mapped);
    }

    // Time Off
    static async createTimeOff(data) {
        const mapped = {
            location_group: data.locationGroup,
            assigned_roles: data.assignedRoles
        };
        return await MhrtRepository.createTimeOff(mapped);
    }

    static async updateTimeOff(id, data) {
        const mapped = {};
        if (data.locationGroup !== undefined) mapped.location_group = data.locationGroup;
        if (data.assignedRoles !== undefined) mapped.assigned_roles = data.assignedRoles;
        return await MhrtRepository.updateTimeOff(id, mapped);
    }

    // Directory
    static async createDirectory(data) {
        const mapped = {
            account: data.account,
            name: data.name || 'N/A',
            team: data.team,
            distro: data.distro
        };
        return await MhrtRepository.createDirectory(mapped);
    }

    static async updateDirectory(id, data) {
        const mapped = { ...data };
        return await MhrtRepository.updateDirectory(id, mapped);
    }
}
