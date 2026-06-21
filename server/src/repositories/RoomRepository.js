import { query } from '../db.js';
import { buildUpdate, buildInsert } from '../utils/db-utils.js';

export class RoomRepository {
    static async findAll() {
        const result = await query(
            'SELECT id, room_number, room_name, status, is_active, current_application_id, current_applicant_name, occupied_since, image_url, room_type FROM interview_rooms ORDER BY room_number ASC'
        );
        return result.rows;
    }

    static async findById(id) {
        const result = await query('SELECT * FROM interview_rooms WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async create(data) {
        const build = buildInsert('interview_rooms', data);
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async update(id, data) {
        const build = buildUpdate('interview_rooms', data, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await query('DELETE FROM interview_rooms WHERE id = $1 RETURNING room_number', [id]);
        return result.rows[0];
    }
}
