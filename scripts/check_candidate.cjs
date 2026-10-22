require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        a.id, a.first_name, a.last_name, 
        a.current_status,
        a.metadata
      FROM applications a
      WHERE a.first_name ILIKE $1 OR a.last_name ILIKE $2
      ORDER BY a.created_at DESC
      LIMIT 10
    `, ['%Mary Annielou%', '%Cauley%']);
    
    if (res.rows.length > 0) {
      for (const row of res.rows) {
        console.log("Candidate:", row.first_name, row.last_name);
        console.log("Current Status:", row.current_status);
        console.log("Specific Status (metadata):", row.metadata?.specific_status);
        console.log("Final Specific Status (metadata):", row.metadata?.final_specific_status);
        console.log("PIS Object Ops Val:", row.metadata?.pis?.ops_validator_status);
        console.log("Ops Val (metadata):", row.metadata?.ops_validator_status);
        console.log("Failure Details (metadata):", row.metadata?.failure_details);
        console.log("Rejection Reason (metadata):", row.metadata?.rejection_reason);
        console.log("-------------------");
      }
    } else {
      console.log("Candidate not found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
