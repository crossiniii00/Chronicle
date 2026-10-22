const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/server/database.sqlite');
db.all("SELECT applicant_name, department, master_column, master_status, endorsement_account FROM applications WHERE applicant_name LIKE '%Celine%'", (err, rows) => {
  if(err) console.error(err);
  else console.log(JSON.stringify(rows, null, 2));
});
