import { pool } from './src/db.js';

async function main() {
  const result = await pool.query("SELECT config_data FROM report_configs WHERE id = 'masterlist_tracker_settings'");
  if (result.rows.length > 0) {
    const config = result.rows[0].config_data;
    console.log("Found config!");
    
    let modified = false;

    // Check customColumnNames and remove POE/COE keys
    if (config.customColumnNames) {
        for (const sheet of Object.keys(config.customColumnNames)) {
            const sheetNames = config.customColumnNames[sheet];
            for (const [key, val] of Object.entries(sheetNames)) {
                if (val === 'POE' || val === 'COE') {
                    console.log(`Deleting renamed column ${key} => ${val}`);
                    delete config.customColumnNames[sheet][key];
                    modified = true;
                }
            }
        }
    }
    
    // Check customColumns
    if (config.customColumns) {
        for (const sheet of Object.keys(config.customColumns)) {
            const cols = config.customColumns[sheet];
            const filteredCols = cols.filter(c => c.label !== 'POE' && c.label !== 'COE');
            if (filteredCols.length !== cols.length) {
                console.log(`Deleted custom column from ${sheet}`);
                config.customColumns[sheet] = filteredCols;
                modified = true;
            }
        }
    }

    if (modified) {
        await pool.query("UPDATE report_configs SET config_data = $1 WHERE id = 'masterlist_tracker_settings'", [JSON.stringify(config)]);
        console.log("Updated report_configs!");
    } else {
        console.log("POE or COE not found in custom configs.");
    }
  } else {
    console.log("masterlist_tracker_settings not found.");
  }
  process.exit(0);
}

main().catch(console.error);
