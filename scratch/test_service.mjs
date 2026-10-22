import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), 'server', '.env') });
import { ApplicationService } from '../server/src/services/ApplicationService.js';
import { ApplicationRepository } from '../server/src/repositories/ApplicationRepository.js';

async function test() {
    try {
        const targetId = '549c8e40-f06b-4956-8ca5-286f0ee56255';
        
        console.log('Updating target ID:', targetId);
        const patch = {
            metadata: { test: '123' },
            interview_responses: { q1: 'TESTING RESPONSE 123' }
        };
        
        await ApplicationService.updateApplicationStatus(
            targetId,
            'ASSESSMENT',
            'Test',
            'Admin User',
            { role: 'admin', full_name: 'Admin User' },
            '127.0.0.1',
            'Test Agent',
            null, // io
            patch
        );
        
        const final = await ApplicationRepository.findById(targetId);
        console.log('Final interview_responses:', final.interview_responses);
        
    } catch(e) {
        console.error(e);
    }
}
test();
