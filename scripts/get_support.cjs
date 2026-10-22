const {Pool} = require('pg');
const pool = new Pool({connectionString: 'postgresql://postgres:12345@localhost:5432/recruitms'});

(async () => {
    try {
        const res = await pool.query("DELETE FROM departments WHERE name ILIKE '%support group%' RETURNING *");
        console.log("DELETED DEPARTMENTS:", JSON.stringify(res.rows, null, 2));
    } catch(e) { console.error(e.message); }
    pool.end();
})();
