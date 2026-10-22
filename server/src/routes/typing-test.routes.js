import { Router } from 'express';
import { z } from 'zod';
import { calculateTypingMetrics } from '../utils/metrics-utils.js';
import { query } from '../db.js';
import { ApplicationRepository } from '../repositories/ApplicationRepository.js';

const typingSchema = z.object({
    promptText: z.string().min(20),
    typedText: z.string(),
    durationSeconds: z.number().int().positive(),
});

export const typingTestRouter = Router();

typingTestRouter.post('/score', (req, res, next) => {
    try {
        const payload = typingSchema.parse(req.body);
        const result = calculateTypingMetrics(payload);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

typingTestRouter.post('/log', async (req, res, next) => {
    try {
        const { applicantName, applicantEmail, wpm, accuracy, timeTaken, errors, totalWords, isPassed, attemptNumber } = req.body;
        
        await query(`
            INSERT INTO typing_attempts (applicant_name, applicant_email, wpm, accuracy, time_taken, errors, total_words, is_passed, attempt_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [applicantName, applicantEmail, wpm, accuracy, timeTaken, errors, totalWords, isPassed, attemptNumber]);

        if (applicantEmail) {
            const app = await ApplicationRepository.findByEmail(applicantEmail);
            if (app) {
                const existingMeta = typeof app.metadata === 'string' ? JSON.parse(app.metadata) : (app.metadata || {});
                existingMeta.pending_typing_retake = {
                    wpm: wpm,
                    accuracy: accuracy,
                    duration: timeTaken,
                    isPassed: isPassed,
                    submittedAt: new Date().toISOString()
                };
                
                await ApplicationRepository.update(app.id, {
                    metadata: JSON.stringify(existingMeta)
                }, 'System', 'Typing Retake Submitted', true);
                
                req.app.locals.io?.emit('applications:updated', { 
                    applicationId: app.id, 
                    toStatus: app.current_status, 
                    data: await ApplicationRepository.findById(app.id) 
                });
            }
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

typingTestRouter.get('/logs', async (req, res, next) => {
    try {
        // We use a CTE to get the best matching name from applications, preferring first/last name
        const trackingQuery = `
            WITH AppNames AS (
                SELECT DISTINCT ON (applicant_email) 
                    applicant_email, 
                    COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), NULLIF(TRIM(applicant_name), '')) as full_name
                FROM applications
                WHERE applicant_email IS NOT NULL AND applicant_email != ''
            )
            SELECT DISTINCT ON (t.applicant_name, t.applicant_email) 
                t.*,
                COALESCE(
                    NULLIF(TRIM(t.applicant_name), ''),
                    NULLIF(TRIM(a.full_name), ''),
                    'Unknown'
                ) as resolved_applicant_name
            FROM typing_attempts t
            LEFT JOIN AppNames a ON a.applicant_email = t.applicant_email
            ORDER BY t.applicant_name, t.applicant_email, t.created_at DESC
        `;
        
        const allQuery = `
            WITH AppNames AS (
                SELECT DISTINCT ON (applicant_email) 
                    applicant_email, 
                    COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), NULLIF(TRIM(applicant_name), '')) as full_name,
                    typing_test_wpm,
                    typing_test_accuracy,
                    typing_test_duration_seconds,
                    typing_test_completed_at
                FROM applications
                WHERE applicant_email IS NOT NULL AND applicant_email != ''
            )
            SELECT t.*,
                COALESCE(
                    NULLIF(TRIM(t.applicant_name), ''),
                    NULLIF(TRIM(a.full_name), ''),
                    'Unknown'
                ) as resolved_applicant_name
            FROM typing_attempts t
            LEFT JOIN AppNames a ON a.applicant_email = t.applicant_email
            
            UNION ALL
            
            SELECT 
                -(floor(random() * 1000000)::integer) as id,
                a.full_name as applicant_name,
                a.applicant_email,
                CAST(CAST(a.typing_test_wpm AS NUMERIC) AS INTEGER) as wpm,
                CAST(CAST(a.typing_test_accuracy AS NUMERIC) AS INTEGER) as accuracy,
                COALESCE(CAST(CAST(a.typing_test_duration_seconds AS NUMERIC) AS INTEGER), 60) as time_taken,
                0 as errors,
                0 as total_words,
                (CAST(CAST(a.typing_test_wpm AS NUMERIC) AS INTEGER) >= 30) as is_passed,
                (SELECT COALESCE(MAX(attempt_number), 0) + 1 FROM typing_attempts WHERE applicant_email = a.applicant_email) as attempt_number,
                COALESCE(a.typing_test_completed_at, NOW()) as created_at,
                a.full_name as resolved_applicant_name
            FROM AppNames a
            WHERE a.typing_test_wpm IS NOT NULL
            AND CAST(a.typing_test_wpm AS TEXT) != ''
            AND NOT EXISTS (
                SELECT 1 FROM typing_attempts ta 
                WHERE ta.applicant_email = a.applicant_email 
                AND ta.wpm = CAST(CAST(a.typing_test_wpm AS NUMERIC) AS INTEGER)
                AND (ta.accuracy = CAST(CAST(a.typing_test_accuracy AS NUMERIC) AS INTEGER) OR ta.accuracy IS NULL OR a.typing_test_accuracy IS NULL)
            )
            ORDER BY created_at DESC
        `;

        const trackingResult = await query(trackingQuery);
        const allAttemptsResult = await query(allQuery);
        
        // Map resolved_applicant_name back to applicant_name for the frontend
        const mapName = (row) => ({ ...row, applicant_name: row.resolved_applicant_name });

        res.json({ 
            tracking: trackingResult.rows.map(mapName),
            allAttempts: allAttemptsResult.rows.map(mapName),
            history: []
        });
    } catch (error) {
        next(error);
    }
});

// Admin overrides
typingTestRouter.post('/clear', async (req, res, next) => {
    try {
        const { applicantName } = req.body;
        await query(`DELETE FROM typing_attempts WHERE applicant_name = $1`, [applicantName]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

typingTestRouter.post('/set-attempts', async (req, res, next) => {
    try {
        const { applicantName, count } = req.body;
        // In a real database, to set attempts to X we can just insert/delete rows.
        // For simplicity, we just delete all and insert X dummy rows.
        await query(`DELETE FROM typing_attempts WHERE applicant_name = $1`, [applicantName]);
        for(let i=0; i<count; i++) {
            await query(`
                INSERT INTO typing_attempts (applicant_name, applicant_email, wpm, accuracy, time_taken, errors, total_words, is_passed, attempt_number)
                VALUES ($1, '', 0, 0, 0, 0, 0, false, $2)
            `, [applicantName, i+1]);
        }
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});
