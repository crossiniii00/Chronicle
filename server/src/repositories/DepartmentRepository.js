import { query } from '../db.js';
import { buildUpdate, buildInsert } from '../utils/db-utils.js';

export class DepartmentRepository {
    static selectColumns = 'id, name, head, budget_code as "budgetCode", account_image_url as "accountImageUrl", account_image_data as "accountImageData", eligibility_settings as "eligibilitySettings", sub_accounts as "subAccounts", created_at, type';

    static async findAll() {
        const result = await query(
            `SELECT ${this.selectColumns} FROM departments ORDER BY name ASC`
        );
        return result.rows;
    }

    static async findById(id) {
        const result = await query(
            `SELECT ${this.selectColumns} FROM departments WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async findByName(name) {
        const result = await query(
            `SELECT ${this.selectColumns} FROM departments WHERE LOWER(name) = LOWER($1)`,
            [name]
        );
        return result.rows[0];
    }

    static async create(data) {
        const build = buildInsert('departments', {
            name: data.name,
            head: data.head || '',
            budget_code: data.budgetCode || '',
            account_image_url: data.accountImageUrl || null,
            account_image_data: data.accountImageData || null,
            type: data.type || 'ACCOUNTS',
            sub_accounts: data.subAccounts ? (typeof data.subAccounts === 'object' ? JSON.stringify(data.subAccounts) : data.subAccounts) : '[]',
            eligibility_settings: data.eligibilitySettings ? (typeof data.eligibilitySettings === 'object' ? JSON.stringify(data.eligibilitySettings) : data.eligibilitySettings) : null
        });
        const result = await query(build.text, build.values);
        return await this.findById(result.rows[0].id);
    }

    static async update(id, data) {
        const mapped = {};
        if (data.name !== undefined) mapped.name = data.name;
        if (data.head !== undefined) mapped.head = data.head;
        if (data.budgetCode !== undefined) mapped.budget_code = data.budgetCode;
        if (data.accountImageUrl !== undefined) mapped.account_image_url = data.accountImageUrl;
        if (data.accountImageData !== undefined) mapped.account_image_data = data.accountImageData;
        if (data.type !== undefined) mapped.type = data.type;
        if (data.subAccounts !== undefined) mapped.sub_accounts = typeof data.subAccounts === 'object' ? JSON.stringify(data.subAccounts) : data.subAccounts;
        if (data.eligibilitySettings !== undefined) mapped.eligibility_settings = typeof data.eligibilitySettings === 'object' ? JSON.stringify(data.eligibilitySettings) : data.eligibilitySettings;

        const build = buildUpdate('departments', mapped, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return await this.findById(result.rows[0].id);
    }

    static async delete(id) {
        await query('DELETE FROM departments WHERE id = $1', [id]);
    }
}
