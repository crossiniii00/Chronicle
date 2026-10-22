require('dotenv').config();
const pool = require('../server/src/db.js');

async function check() {
    try {
        const res = await pool.query(`SELECT id, title, department, status, requirements as qualifications, category_id FROM positions;`);
        const open = res.rows.filter(item => item.status === 'OPEN' && !item.title.includes('[INTERNAL]') && !item.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA'));
        console.log(`Matching OPEN items: ${open.length}`);
        console.log(open);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
