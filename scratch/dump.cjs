const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:12345@localhost:5432/recruitms' });
client.connect().then(() => client.query("SELECT config_data FROM report_configs WHERE id = 'masterlist_tracker_settings'")).then(res => {
    console.log(JSON.stringify(res.rows[0].config_data.customColumns));
    client.end();
}).catch(err => { console.error(err); process.exit(1); });
