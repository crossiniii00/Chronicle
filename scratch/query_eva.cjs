const { Client } = require('pg');
const client = new Client({ user: 'postgres', host: 'localhost', database: 'recruitms', password: '12345', port: 5432 });
client.connect().then(() => client.query(`SELECT applicant_name, applicant_email, metadata->'typing_test_retake' as retake_data, metadata->'typing_test_attempts' as attempts FROM applications WHERE applicant_name ILIKE '%eva%' LIMIT 20`)).then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    client.end();
}).catch(console.error);
