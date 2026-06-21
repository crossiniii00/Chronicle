import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../server/src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyMigrations() {
    console.log('🚀 Starting Database Migration Runner...');
    
    try {
        // 1. Apply Base Schema
        const baseSchemaPath = path.join(__dirname, '../database/postgres/local_server_schema.sql');
        if (fs.existsSync(baseSchemaPath)) {
            console.log('📄 Applying Base Schema...');
            const sql = fs.readFileSync(baseSchemaPath, 'utf8');
            await pool.query(sql);
            console.log('✅ Base Schema applied successfully.');
        }

        // 2. Apply Differential Migrations
        const migrationsDir = path.join(__dirname, '../database/migrations');
        if (fs.existsSync(migrationsDir)) {
            const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
            
            for (const file of files) {
                console.log(`📄 Applying Migration: ${file}...`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                await pool.query(sql);
                console.log(`✅ ${file} applied successfully.`);
            }
        }

        console.log('🎉 All migrations applied successfully!');
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

applyMigrations();
