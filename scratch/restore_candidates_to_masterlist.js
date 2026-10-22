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
        console.log('--- UPDATING MASTER_COLUMN TO MASTERLIST FOR SPECIFIED CANDIDATES ---');

        const namesToRestore = [
            'Lyndon Vanriel Daal',
            'Aeron Heavynne Alferan',
            'Kirk Jr Vidal',
            'Ailene  Gonzaga',
            'Ailene Gonzaga',
            'Clarisse Escarro',
            'Amber Smith Lyncel Calinawan',
            'Anthony Dave Sutchesa',
            'SOPHEA FRITZIE JANE SABAYTON',
            'Angel Bert (Jadraque) Catane',
            'Angel Bert Catane'
        ];

        for (const name of namesToRestore) {
            const res = await pool.query(
                "SELECT id, applicant_name, master_column, current_status, metadata FROM applications WHERE applicant_name ILIKE $1;",
                [`%${name}%`]
            );

            for (const app of res.rows) {
                const updatedMeta = {
                    ...(app.metadata || {}),
                    master_column: 'MASTERLIST'
                };

                await pool.query(
                    `UPDATE applications 
                     SET master_column = 'MASTERLIST', 
                         metadata = $1, 
                         updated_at = NOW() 
                     WHERE id = $2;`,
                    [updatedMeta, app.id]
                );

                console.log(`[RESTORED] ${app.applicant_name} (ID: ${app.id}) -> master_column set to MASTERLIST`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
