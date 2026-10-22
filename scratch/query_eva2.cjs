const { Client } = require('pg');
const client = new Client({ user: 'postgres', host: 'localhost', database: 'recruitms', password: '12345', port: 5432 });
client.connect().then(() => client.query(`SELECT id, applicant_name, applicant_email, metadata->'first_name' as fn, metadata->'last_name' as ln FROM applications WHERE metadata->>'first_name' ILIKE '%eva%' OR metadata->>'last_name' ILIKE '%morata%' LIMIT 5`)).then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    client.end();
}).catch(console.error);
