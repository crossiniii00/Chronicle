import { query } from '../db.js';
import { buildUpdate } from '../utils/db-utils.js';

export class QueueRepository {
    static async findToday() {
        const result = await query(
            `SELECT q.*, a.current_status as application_status FROM queue q 
             LEFT JOIN applications a ON q.application_id = a.id
             WHERE q.created_at >= NOW() - INTERVAL '24 hours'
             ORDER BY q.queue_number ASC`
        );
        return result.rows;
    }

    static async findActive(type) {
        let sql = `SELECT q.*, a.current_status as application_status FROM queue q 
                   LEFT JOIN applications a ON q.application_id = a.id
                     WHERE q.status IN ('WAITING', 'IN_PROGRESS', 'CALLED', 'DRAFT', 'RESCHEDULED') 
                     AND q.created_at >= NOW() - INTERVAL '24 hours'`;
        const params = [];

        if (type) {
            params.push(type);
            sql += ` AND q.queue_type = $${params.length}`;
        }

        sql += ` ORDER BY q.queue_number ASC`;
        const result = await query(sql, params);
        return result.rows;
    }

    static async delete(id) {
        await query(`DELETE FROM queue WHERE id = $1`, [id]);
    }

    static async findById(id) {
        const result = await query(`SELECT * FROM queue WHERE id = $1`, [id]);
        return result.rows[0];
    }

    static async update(id, data) {
        const build = buildUpdate('queue', data, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async reset() {
        await query(`DELETE FROM queue`);
        await query(`UPDATE applications SET queue_number = NULL, queue_prefix = NULL WHERE queue_number IS NOT NULL OR queue_prefix IS NOT NULL`);
    }
}
