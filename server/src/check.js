import { query } from './db.js';
query('SELECT id FROM applications WHERE id = $1', ['be764fb0-b00a-44b2-ab6b-1b99d924aff3'])
  .then(r => console.log('Rows:', r.rows))
  .catch(console.error)
  .finally(() => process.exit());
