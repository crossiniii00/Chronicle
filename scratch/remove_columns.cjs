const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:12345@localhost:5432/recruitms' });
client.connect().then(() => client.query("SELECT config_data FROM report_configs WHERE id = 'masterlist_tracker_settings'")).then(res => {
    if (res.rows.length === 0) { console.log('No settings found'); return client.end(); }
    const config = res.rows[0].config_data;
    if (!config || !config.customColumns) { console.log('No customColumns found'); return client.end(); }
    let changed = false;
    for (const tab in config.customColumns) {
        const cols = config.customColumns[tab];
        const newCols = cols.filter(c => {
            const key = c.subField ? c.field + '.' + c.subField : c.field;
            return key !== 'pis.custom_coe' && key !== 'pis.custom_poe' && key !== 'pis.custom_psa_nso' && key !== 'pis.custom_notes' && key !== 'pis.custom_peme_result';
        });
        if (newCols.length !== cols.length) {
            config.customColumns[tab] = newCols;
            changed = true;
        }
    }
    if (changed) {
        client.query("UPDATE report_configs SET config_data = $1 WHERE id = 'masterlist_tracker_settings'", [config]).then(() => {
            console.log('Columns removed successfully. Please refresh the frontend!');
            client.end();
        });
    } else {
        console.log('No columns needed removing.');
        client.end();
    }
}).catch(err => { console.error(err); process.exit(1); });
