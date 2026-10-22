import { ApplicationRepository } from '../server/src/repositories/ApplicationRepository.js';
import { ApplicationService } from '../server/src/services/ApplicationService.js';

async function test() {
    try {
        console.log('Testing coerceVal on interview_responses');
        
        const patch = {
            metadata: {
                test: 'metadata'
            },
            interview_responses: {}
        };
        
        const updateData = {
            ...patch,
            current_status: 'OPEN'
        };
        
        console.log('Final data passed to repo:', updateData);
        // We won't actually update it, just want to see how coerceVal behaves, 
        // let's manually mock coerceVal
        const { pis, ...rest } = updateData;
        const finalData = {};
        const booleanCols = new Set(['flexible_schedule', 'is_graduated', 'has_medical_conditions', 'drinks_alcohol', 'smokes', 'is_pregnant', 'endorsed_to_recruiter_s', 'deleted_from_masterlist']);
        
        const coerceVal = (key, val) => {
            if (val === null || val === undefined || val === '') {
                return null;
            }
            if (booleanCols.has(key)) {
                return Boolean(val);
            }
            if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
                return JSON.stringify(val);
            }
            return val;
        };

        Object.keys(rest).forEach(key => {
            if (ApplicationRepository.VALID_COLUMNS.has(key)) {
                finalData[key] = coerceVal(key, rest[key]);
            } else {
                console.log('Ignored field:', key);
            }
        });

        console.log('Final data mapped:', finalData);
    } catch(e) {
        console.error(e);
    }
}
test();
