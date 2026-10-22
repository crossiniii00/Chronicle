import { query, pool } from '../db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function cleanGhostReservations() {
    console.log("==========================================");
    console.log("  GHOST RESERVATIONS DATABASE CLEANUP    ");
    console.log("==========================================");
    
    try {
        const roomsRes = await query(
            'SELECT id, room_name, room_number, reservations FROM interview_rooms'
        );
        const rooms = roomsRes.rows;
        
        let totalRoomsChecked = 0;
        let totalReservationsChecked = 0;
        let totalReservationsRemoved = 0;

        for (const room of rooms) {
            totalRoomsChecked++;
            const reservations = room.reservations || [];
            
            if (reservations.length === 0) continue;
            
            const appIds = reservations.map(r => r.applicant_id).filter(Boolean);
            totalReservationsChecked += reservations.length;

            if (appIds.length > 0) {
                // Query application statuses
                const appRes = await query(
                    "SELECT id, applicant_name, current_status FROM applications WHERE id = ANY($1)",
                    [appIds]
                );
                
                const appMap = new Map(appRes.rows.map(a => [a.id, { 
                    name: a.applicant_name, 
                    status: a.current_status 
                }]));

                const cleaned = reservations.filter(res => {
                    const app = appMap.get(res.applicant_id);
                    
                    // 1. Remove if applicant doesn't exist in database
                    if (!app) {
                        console.log(`[Ghost Removed] Room "${room.room_name}": Deleted applicant ID ${res.applicant_id} (${res.applicant_name})`);
                        totalReservationsRemoved++;
                        return false;
                    }

                    // 2. Remove if applicant reached concluded/terminal stage
                    const statusUpper = (app.status || '').toUpperCase().trim();
                    const terminalStatuses = [
                        'FAILED', 'REJECTED', 'WITHDRAWN', 'DECLINED', 'NOT_ELIGIBLE_FOR_REHIRE',
                        'BLACKLISTED', 'PASSED', 'HIRED', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 
                        'HIRED_PROCESSED', 'SENT_JO_AND_BGC', 'FOR_PAN'
                    ];
                    
                    if (terminalStatuses.includes(statusUpper)) {
                        console.log(`[Ghost Removed] Room "${room.room_name}": Candidate ${app.name} has terminal status: "${statusUpper}"`);
                        totalReservationsRemoved++;
                        return false;
                    }

                    return true;
                });

                if (cleaned.length !== reservations.length) {
                    await query(
                        "UPDATE interview_rooms SET reservations = $1 WHERE id = $2",
                        [JSON.stringify(cleaned), room.id]
                    );
                    console.log(`[Room Updated] Room "${room.room_name}" reservations updated. (${cleaned.length} left)`);
                }
            }
        }

        console.log("==========================================");
        console.log(` Rooms Evaluated:       ${totalRoomsChecked}`);
        console.log(` Reservations Evaluated: ${totalReservationsChecked}`);
        console.log(` Ghost Reservations Removed: ${totalReservationsRemoved}`);
        console.log(" Cleanup Process Completed Successfully!");
        console.log("==========================================");

    } catch (error) {
        console.error("Error running reservations cleanup:", error);
    } finally {
        await pool.end();
    }
}

cleanGhostReservations();
