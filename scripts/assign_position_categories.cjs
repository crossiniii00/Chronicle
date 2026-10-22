require('dotenv').config();
const pool = require('../server/src/db.js');

async function assignCategories() {
    try {
        const catsRes = await pool.query(`SELECT id, name FROM job_categories;`);
        const techCat = catsRes.rows.find(c => c.name.toLowerCase().includes('technical') || c.name.toLowerCase().includes('support')) || catsRes.rows[0];
        const csCat = catsRes.rows.find(c => c.name.toLowerCase().includes('customer')) || catsRes.rows[1] || techCat;

        console.log('Using tech category:', techCat);
        console.log('Using customer service category:', csCat);

        // Map tech positions to their appropriate client departments and categories
        const mapping = [
            { title: 'Azure Cloud Solutions Specialist', dept: 'Microsoft', cat: techCat.id },
            { title: 'Xbox Enterprise Support Representative', dept: 'Microsoft', cat: csCat.id },
            { title: 'AI Operations & CUDA Support Engineer', dept: 'NVIDIA', cat: techCat.id },
            { title: 'GeForce Premium Customer Advocate', dept: 'NVIDIA', cat: csCat.id },
            { title: 'Radeon Systems Technical Associate', dept: 'AMD', cat: techCat.id },
            { title: 'EPYC Server Infrastructure Specialist', dept: 'AMD', cat: techCat.id },
            { title: 'AppleCare Senior Technical Advisor', dept: 'Apple', cat: techCat.id },
            { title: 'iOS Ecosystem Quality Specialist', dept: 'Apple', cat: csCat.id },
            { title: 'AWS Cloud Technical Support Engineer', dept: 'Amazon', cat: techCat.id },
            { title: 'Prime Logistics Operations Lead', dept: 'Amazon', cat: csCat.id },
            { title: 'GCP Enterprise Solutions Associate', dept: 'Google', cat: techCat.id },
            { title: 'Pixel Hardware Support Specialist', dept: 'Google', cat: techCat.id },
        ];

        for (const item of mapping) {
            await pool.query(
                `UPDATE positions 
                 SET department = $1, category_id = $2, status = 'OPEN' 
                 WHERE title = $3`,
                [item.dept, item.cat, item.title]
            );
            console.log(`Updated position: ${item.title} -> ${item.dept} (${item.cat})`);
        }

        console.log('All 12 demo positions updated successfully with departments and categories!');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

assignCategories();
