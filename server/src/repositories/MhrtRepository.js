import { query } from '../db.js';
import { buildUpdate, buildInsert } from '../utils/db-utils.js';

export class MhrtRepository {
    // Master Accounts
    static async findAllAccounts(department = null) {
        let sql = `
            SELECT 
                id, account, lob, pseudonym, position, 
                campaign_manager as "campaignManager", team_manager as "teamManager",
                base_salary as "baseSalary", allowance, 
                account_specific_tracker as "accountSpecificTracker", 
                assessments, job_description as "jobDescription",
                roster_lock as "rosterLock", tool_testing as "toolTesting", 
                hoops, voice_type as "voiceType", direction, vertical, 
                education, work_experience as "workExperience", 
                typing_speed as "typingSpeed", typing_accuracy as "typingAccuracy",
                cefr, ase, ov_status as "ovStatus", 
                ops_validator as "opsValidator", ov_availability as "ovAvailability",
                client_availability as "clientAvailability", location, 
                operations_director as "operationsDirector", trainer, 
                wfm_poc as "wfmPoc", final_interview_schedule as "finalInterviewSchedule",
                must_haves as "mustHaves", nice_to_haves as "niceToHaves",
                hmo, relocation, demographics, background_investigation as "backgroundInvestigation"
            FROM mhrt_accounts
        `;
        const params = [];

        if (department) {
            const depts = department.split(',').map(d => d.trim()).filter(Boolean);
            if (depts.length > 0) {
                sql += ` WHERE account = ANY($1)`;
                params.push(depts);
            }
        }

        sql += ` ORDER BY created_at DESC`;

        const result = await query(sql, params);
        return result.rows;
    }

    static async createAccount(data) {
        const build = buildInsert('mhrt_accounts', data);
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async updateAccount(id, data) {
        const build = buildUpdate('mhrt_accounts', data, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async deleteAccount(id) {
        await query('DELETE FROM mhrt_accounts WHERE id = $1', [id]);
    }

    // H2R Records
    static async findAllH2R(department = null) {
        let sql = `
            SELECT 
                id, account, lob, job_location as "jobLocation", division, 
                line_of_business as "lineOfBusiness", department, 
                reports_to as "reportsTo", training, nesting
            FROM mhrt_h2r_records
        `;
        const params = [];

        if (department) {
            const depts = department.split(',').map(d => d.trim()).filter(Boolean);
            if (depts.length > 0) {
                sql += ` WHERE account = ANY($1)`;
                params.push(depts);
            }
        }

        sql += ` ORDER BY created_at DESC`;

        const result = await query(sql, params);
        return result.rows;
    }

    static async createH2R(data) {
        const build = buildInsert('mhrt_h2r_records', data);
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async updateH2R(id, data) {
        const build = buildUpdate('mhrt_h2r_records', data, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async deleteH2R(id) {
        await query('DELETE FROM mhrt_h2r_records WHERE id = $1', [id]);
    }

    // Divisions
    static async findAllDivisions() {
        const result = await query('SELECT id, division, assigned_roles as "assignedRoles" FROM mhrt_division_mappings');
        return result.rows;
    }

    static async createDivision(data) {
        const build = buildInsert('mhrt_division_mappings', data);
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async updateDivision(id, data) {
        const build = buildUpdate('mhrt_division_mappings', data, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async deleteDivision(id) {
        await query('DELETE FROM mhrt_division_mappings WHERE id = $1', [id]);
    }

    // Time Off
    static async findAllTimeOff() {
        const result = await query('SELECT id, location_group as "locationGroup", assigned_roles as "assignedRoles" FROM mhrt_time_off_assignments');
        return result.rows;
    }

    static async createTimeOff(data) {
        const build = buildInsert('mhrt_time_off_assignments', data);
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async updateTimeOff(id, data) {
        const build = buildUpdate('mhrt_time_off_assignments', data, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async deleteTimeOff(id) {
        await query('DELETE FROM mhrt_time_off_assignments WHERE id = $1', [id]);
    }

    // Directory
    static async findAllDirectory(department = null) {
        let sql = `SELECT id, account, name, team, distro FROM mhrt_directory`;
        const params = [];

        if (department) {
            const depts = department.split(',').map(d => d.trim()).filter(Boolean);
            if (depts.length > 0) {
                sql += ` WHERE account = ANY($1)`;
                params.push(depts);
            }
        }

        const result = await query(sql, params);
        return result.rows;
    }

    static async createDirectory(data) {
        const build = buildInsert('mhrt_directory', data);
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async updateDirectory(id, data) {
        const build = buildUpdate('mhrt_directory', data, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async deleteDirectory(id) {
        await query('DELETE FROM mhrt_directory WHERE id = $1', [id]);
    }
}
