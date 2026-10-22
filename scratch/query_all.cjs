const { Client } = require('pg');
const client = new Client({ user: 'postgres', host: 'localhost', database: 'recruitms', password: '12345', port: 5432 });
client.connect().then(() => client.query(`SELECT applicant_name FROM applications`)).then(res => {
    console.log(JSON.stringify(res.rows.map(r => r.applicant_name), null, 2));
    client.end();
}).catch(console.error);
