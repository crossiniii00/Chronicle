import { query } from '../db.js';
import { buildUpdate, buildInsert } from '../utils/db-utils.js';

export class RoomRepository {
    static async findAll() {
        const result = await query(
            'SELECT id, room_number, room_name, status, is_active, current_application_id, current_applicant_name, occupied_since, occupied_until, image_url, room_type, reservations, assigned_interviewer_name FROM interview_rooms ORDER BY room_number ASC'
        );
        const rooms = result.rows;

        // Auto-heal ghost reservations
        try {
            for (const room of rooms) {
                if (room.reservations && Array.isArray(room.reservations) && room.reservations.length > 0) {
                    const appIds = room.reservations.map(r => r.applicant_id).filter(Boolean);
                    if (appIds.length > 0) {
                        const appRes = await query(
                            "SELECT id, current_status FROM applications WHERE id = ANY($1)",
                            [appIds]
                        );
                        const appMap = new Map(appRes.rows.map(a => [a.id, a.current_status]));

                        const cleaned = room.reservations.filter(res => {
                            const appStatus = appMap.get(res.applicant_id);
                            if (!appStatus) return false; // remove if applicant deleted
                            
                            const statusUpper = appStatus.toUpperCase().trim();
                            const terminalStatuses = [
                                'FAILED', 'REJECTED', 'WITHDRAWN', 'DECLINED', 'NOT_ELIGIBLE_FOR_REHIRE',
                                'BLACKLISTED', 'PASSED', 'HIRED', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 
                                'HIRED_PROCESSED', 'SENT_JO_AND_BGC', 'FOR_PAN'
                            ];
                            if (terminalStatuses.includes(statusUpper)) return false;
                            
                            return true;
                        });

                        if (cleaned.length !== room.reservations.length) {
                            await RoomRepository.update(room.id, { reservations: cleaned });
                            room.reservations = cleaned;
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[RoomRepository] Failed to run automated ghost reservations sweep:', err);
        }

        return rooms;
    }

    static async findById(id) {
        const result = await query('SELECT * FROM interview_rooms WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async create(data) {
        const createData = { ...data };
        if (createData.reservations && typeof createData.reservations === 'object') {
            createData.reservations = JSON.stringify(createData.reservations);
        }
        const build = buildInsert('interview_rooms', createData);
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async update(id, data) {
        const updateData = { ...data };
        if (updateData.reservations && typeof updateData.reservations === 'object') {
            updateData.reservations = JSON.stringify(updateData.reservations);
        }
        const build = buildUpdate('interview_rooms', updateData, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await query('DELETE FROM interview_rooms WHERE id = $1 RETURNING room_number', [id]);
        return result.rows[0];
    }
}
