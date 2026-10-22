import { pool } from './src/db.js';
pool.query("SELECT id, applicant_name, current_status, typing_test_wpm, metadata FROM applications WHERE applicant_name ILIKE '%Meriel%'")
.then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
