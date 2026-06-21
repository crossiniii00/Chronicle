/**
 * Builds a dynamic SQL UPDATE query.
 * @param {string} table - Table name
 * @param {object} fields - Object containing fields to update
 * @param {string} id - The ID of the record
 * @returns {object} { text, values }
 */
export function buildUpdate(table, fields, id) {
    const keys = Object.keys(fields).filter(key => fields[key] !== undefined && key !== 'updated_at');
    if (keys.length === 0 && !fields.updated_at) return null;

    const sets = keys.map((key, index) => `"${key}" = $${index + 1}`).join(', ');
    const values = keys.map(key => fields[key]);
    values.push(id);
    
    const setClause = sets ? `${sets}, updated_at = NOW()` : `updated_at = NOW()`;
    
    return {
        text: `UPDATE ${table} SET ${setClause} WHERE id = $${values.length} RETURNING *`,
        values
    };
}

/**
 * Builds a dynamic SQL INSERT query.
 * @param {string} table - Table name
 * @param {object} fields - Object containing fields to insert
 * @returns {object} { text, values }
 */
export function buildInsert(table, fields) {
    const keys = Object.keys(fields).filter(key => fields[key] !== undefined);
    if (keys.length === 0) return null;

    const columns = keys.map(key => `"${key}"`).join(', ');
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const values = keys.map(key => fields[key]);

    return {
        text: `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
    };
}
