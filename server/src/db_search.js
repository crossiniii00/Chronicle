import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@db:5432/chronicle' });
    await client.connect();
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    
    for (const row of tablesRes.rows) {
        const tbl = row.table_name;
        try {
            const colsRes = await client.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
                [tbl]
            );
            if (colsRes.rows.length === 0) continue;
            
            const clauses = colsRes.rows.map(c => `CAST("${c.column_name}" AS text) ILIKE '%Allaiza%'`).join(' OR ');
            
            const queryStr = `SELECT * FROM "${tbl}" WHERE ${clauses} LIMIT 5`;
            const res = await client.query(queryStr);
            if (res.rows.length > 0) {
                console.log('MATCH IN TABLE:', tbl);
                res.rows.forEach(r => {
                    console.log(r);
                });
            }
        } catch (e) {
            // console.error(e);
        }
    }
    await client.end();
}
run();
