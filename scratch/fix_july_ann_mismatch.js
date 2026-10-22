import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'chronicle',
    password: '12345',
    port: 5433,
});

async function main() {
    try {
        // Steven Oblena details:
        // ID: dfcc49dc-a09e-4317-9128-cd10ff1691a7
        // Name: Steven Oblena
        // Email: steven.oblena@cp-360.com

        const stevenId = 'dfcc49dc-a09e-4317-9128-cd10ff1691a7';
        const stevenName = 'Steven Oblena';
        const stevenEmail = 'steven.oblena@cp-360.com';

        // 1. Fetch current record
        const getRes = await pool.query(
            "SELECT * FROM applications WHERE applicant_name ILIKE '%July Ann%';"
        );

        if (getRes.rows.length === 0) {
            console.log('July Ann record not found');
            return;
        }

        const app = getRes.rows[0];
        const updatedMetadata = {
            ...(app.metadata || {}),
            department: 'Abbott',
            ops_validator_email: stevenEmail,
            assigned_ops_validator_name: stevenName,
            assigned_ops_validator_id: stevenId,
            assigned_ops_validator_ids: [stevenId],
            initial_account_assignment: 'Abbott'
        };

        const updateRes = await pool.query(
            `UPDATE applications 
             SET department = 'Abbott', 
                 assigned_ops_validator_id = $1, 
                 assigned_ops_validator_name = $2, 
                 metadata = $3, 
                 updated_at = NOW() 
             WHERE id = $4 
             RETURNING id, applicant_name, department, assigned_ops_validator_name;`,
            [stevenId, stevenName, updatedMetadata, app.id]
        );

        console.log('Successfully updated July Ann record:');
        console.log(JSON.stringify(updateRes.rows[0], null, 2));
    } catch (err) {
        console.error('Error updating July Ann:', err);
    } finally {
        await pool.end();
    }
}

main();
