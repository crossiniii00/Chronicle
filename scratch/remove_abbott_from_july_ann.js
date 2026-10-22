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
        const getRes = await pool.query(
            "SELECT * FROM applications WHERE applicant_name ILIKE '%July Ann%';"
        );

        if (getRes.rows.length === 0) {
            console.log('July Ann record not found');
            return;
        }

        const app = getRes.rows[0];
        const newDept = 'Auto Approve';

        const updatedMetadata = {
            ...(app.metadata || {}),
            department: newDept,
            initial_account_assignment: newDept
        };

        const updateRes = await pool.query(
            `UPDATE applications 
             SET department = $1, 
                 metadata = $2, 
                 updated_at = NOW() 
             WHERE id = $3 
             RETURNING id, applicant_name, department, assigned_ops_validator_name;`,
            [newDept, updatedMetadata, app.id]
        );

        console.log('Successfully removed Abbott from July Ann record:');
        console.log(JSON.stringify(updateRes.rows[0], null, 2));
    } catch (err) {
        console.error('Error updating July Ann:', err);
    } finally {
        await pool.end();
    }
}

main();
