const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'db',
    database: 'chronicle',
    password: '12345',
    port: 5432,
});

async function fixJohnMarston() {
    try {
        const result = await pool.query(`SELECT id, metadata FROM applications WHERE id = '3c7894ea-2207-4c64-9f47-467ec22b2e84'`);
        if (result.rows.length === 0) {
            console.log('John Marston not found');
            return;
        }

        let metadata = result.rows[0].metadata;
        if (typeof metadata === 'string') {
            metadata = JSON.parse(metadata);
        }

        // Set the status to PASSED to reflect the Ops Validator's actual conclusion
        metadata.ops_validator_status = 'PASSED';
        metadata.final_specific_status = 'OV - Passed';
        metadata['Specific Status'] = 'OV - Passed';

        if (metadata.pis) {
            metadata.pis.ops_validator_status = 'PASSED';
            metadata.pis.final_specific_status = 'OV - Passed';
        }

        await pool.query(
            `UPDATE applications SET metadata = $1, updated_at = NOW() WHERE id = $2`,
            [JSON.stringify(metadata), result.rows[0].id]
        );

        console.log('Successfully fixed John Marston data.');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

fixJohnMarston();
