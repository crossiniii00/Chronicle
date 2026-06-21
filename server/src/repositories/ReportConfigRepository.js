import { query } from '../db.js';

export class ReportConfigRepository {
    static async findById(id) {
        const result = await query(
            'SELECT * FROM report_configs WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    static async findAll() {
        const result = await query('SELECT * FROM report_configs');
        return result.rows;
    }

    static async upsert(id, configData) {
        const result = await query(
            `INSERT INTO report_configs (id, config_data, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (id) DO UPDATE
             SET config_data = EXCLUDED.config_data,
                 updated_at = NOW()
             RETURNING *`,
            [id, JSON.stringify(configData)]
        );
        return result.rows[0];
    }

    static async delete(id) {
        await query('DELETE FROM report_configs WHERE id = $1', [id]);
    }
}
