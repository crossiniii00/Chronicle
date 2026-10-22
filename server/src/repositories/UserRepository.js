import { pool, query } from '../db.js';
import { buildUpdate } from '../utils/db-utils.js';

export class UserRepository {
    static async findByEmail(email) {
        const result = await query(
            `SELECT id, email, full_name, role, password_hash, password_plain, is_active, department, avatar_data, cover_data
             FROM users
             WHERE LOWER(email) = LOWER($1)`,
            [email]
        );
        return result.rows[0];
    }

    static async findById(id) {
        const result = await query(
            'SELECT id, email, full_name, role, password_hash, department, is_active, created_at, avatar_data, cover_data, password_plain FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    static async findAll() {
        const result = await query(
            'SELECT id, email, full_name, role, department, is_active, created_at, avatar_data, cover_data, password_plain FROM users ORDER BY created_at DESC'
        );
        return result.rows;
    }

    static async create(data) {
        const result = await query(
            `INSERT INTO users (full_name, email, role, password_hash, password_plain, is_active, department, avatar_data, cover_data)
             VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8)
             RETURNING id, full_name, email, role, department, avatar_data, cover_data, password_plain`,
            [data.full_name, data.email, data.role, data.password_hash, data.password_plain || null, data.department || null, data.avatar_data || null, data.cover_data || null]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const build = buildUpdate('users', data, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async delete(id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const fks = await client.query(
                `SELECT tc.table_name, kcu.column_name, c.is_nullable
                 FROM information_schema.table_constraints tc
                 JOIN information_schema.key_column_usage kcu
                     ON tc.constraint_name = kcu.constraint_name
                 JOIN information_schema.constraint_column_usage ccu
                     ON ccu.constraint_name = tc.constraint_name
                 JOIN information_schema.columns c
                     ON c.table_name = tc.table_name
                    AND c.column_name = kcu.column_name
                    AND c.table_schema = tc.table_schema
                 WHERE tc.constraint_type = 'FOREIGN KEY'
                   AND ccu.table_name = 'users'
                   AND ccu.table_schema = 'public'`
            );

            for (const fk of fks.rows) {
                if (fk.is_nullable === 'NO' || fk.table_name === 'notifications') {
                    await client.query(
                        `DELETE FROM "${fk.table_name}" WHERE "${fk.column_name}" = $1`,
                        [id]
                    );
                } else {
                    await client.query(
                        `UPDATE "${fk.table_name}" SET "${fk.column_name}" = NULL WHERE "${fk.column_name}" = $1`,
                        [id]
                    );
                }
            }

            await client.query('DELETE FROM users WHERE id = $1', [id]);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}
