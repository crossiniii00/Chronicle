const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'recruitms',
  user: process.env.POSTGRES_USER || 'postgres',
  password: String(process.env.POSTGRES_PASSWORD || '11111')
});

const demoUsers = [
  // Recruiters
  {
    id: '55555555-5555-4555-a555-555555555555',
    full_name: 'Lucas Wright',
    email: 'lucas.wright@chronicle.local',
    role: 'recruiter_interviewer',
    department: 'NVIDIA,Microsoft,AMD,Apple,Amazon,Google',
    is_active: true
  },
  {
    id: '66666666-6666-4666-a666-666666666666',
    full_name: 'Chloe Davenport',
    email: 'chloe.davenport@chronicle.local',
    role: 'recruiter_interviewer',
    department: 'NVIDIA,Microsoft,AMD,Apple,Amazon,Google',
    is_active: true
  },
  {
    id: '77777777-7777-4777-a777-777777777777',
    full_name: 'David Mercer',
    email: 'david.mercer@chronicle.local',
    role: 'recruiter_a',
    department: 'NVIDIA,Microsoft,AMD,Apple,Amazon,Google',
    is_active: true
  },
  {
    id: '88888888-8888-4888-a888-888888888888',
    full_name: 'Aria Sterling',
    email: 'aria.sterling@chronicle.local',
    role: 'recruiter_jc',
    department: 'NVIDIA,Microsoft,AMD,Apple,Amazon,Google',
    is_active: true
  },

  // Operations Validators assigned to client tech accounts
  {
    id: '99999999-9999-4999-a999-999999999991',
    full_name: 'Ethan Cole',
    email: 'ethan.cole@chronicle.local',
    role: 'ops_validator',
    department: 'NVIDIA',
    is_active: true
  },
  {
    id: '99999999-9999-4999-a999-999999999992',
    full_name: 'Samantha Reed',
    email: 'samantha.reed@chronicle.local',
    role: 'ops_validator',
    department: 'Microsoft',
    is_active: true
  },
  {
    id: '99999999-9999-4999-a999-999999999993',
    full_name: 'Jordan Hayes',
    email: 'jordan.hayes@chronicle.local',
    role: 'ops_validator',
    department: 'Apple',
    is_active: true
  },
  {
    id: '99999999-9999-4999-a999-999999999994',
    full_name: 'Maya Lin',
    email: 'maya.lin@chronicle.local',
    role: 'ops_validator',
    department: 'Amazon',
    is_active: true
  },
  {
    id: '99999999-9999-4999-a999-999999999995',
    full_name: 'Victor Vance',
    email: 'victor.vance@chronicle.local',
    role: 'ops_validator',
    department: 'AMD',
    is_active: true
  },
  {
    id: '99999999-9999-4999-a999-999999999996',
    full_name: 'Serena Blake',
    email: 'serena.blake@chronicle.local',
    role: 'ops_validator',
    department: 'Google',
    is_active: true
  }
];

async function seed() {
  const hash = await bcrypt.hash('password123', 10);
  for (const u of demoUsers) {
    await pool.query(
      `INSERT INTO users (id, full_name, email, password_hash, password_plain, role, department, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department, is_active = true`,
      [u.id, u.full_name, u.email, hash, 'password123', u.role, u.department, u.is_active]
    );
  }
  const allUsers = await pool.query('SELECT role, count(*) FROM users GROUP BY role');
  console.log('Seeded successfully! Current role counts in DB:');
  console.log(allUsers.rows);
  const list = await pool.query('SELECT full_name, role, department FROM users ORDER BY role, full_name');
  console.log('All users:');
  list.rows.forEach(r => console.log(r.role.padEnd(22), '|', r.full_name.padEnd(20), '|', r.department));
  pool.end();
}

seed().catch(err => {
  console.error(err);
  pool.end();
});
