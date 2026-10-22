import { ApplicationService } from './server/src/services/ApplicationService.js';
import { ApplicationRepository } from './server/src/repositories/ApplicationRepository.js';

const submitIvy = async () => {
    try {
        const payload = {
            applicant_id: 'app_' + Date.now(),
            applicant_name: 'Ivy Joy Tampos',
            applicant_email: 'ivy.tampos@example.com',
            position: { id: 1, title: 'Inbound Patient Support' },
            typing_test_passed: false,
            pis: {
                full_name: 'Ivy Joy Tampos',
                first_name: 'Ivy Joy',
                last_name: 'Tampos',
                email: 'ivy.tampos@example.com',
                phone: '09123456789'
            },
            typing_test: { wpm: 23, accuracy: 92, duration: 60 }
        };

        console.log('Submitting application...');
        const app = await ApplicationService.submit(payload);
        console.log('Successfully submitted application ID:', app.id);
        
        console.log('Inserting typing test results...');
        await ApplicationRepository.saveTypingTestResult(app.id, 'The quick brown fox', 'The quick brown fox', 23, 92);
        console.log('Successfully inserted typing test result.');
        process.exit(0);
    } catch (e) {
        console.error('Error submitting application:', e);
        process.exit(1);
    }
};

submitIvy();
