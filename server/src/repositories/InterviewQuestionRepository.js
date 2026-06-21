import { query } from '../db.js';
import { buildUpdate, buildInsert } from '../utils/db-utils.js';

export class InterviewQuestionRepository {
    static async findAllActive() {
        const result = await query(
            `SELECT id, 
                    category,
                    instructions,
                    question_text as "questionText", 
                    question_type as "questionType", 
                    answer_type as "answerType", 
                    is_required as "isRequired", 
                    question_order as "questionOrder",
                    options,
                    max_rating as "maxRating",
                    is_active as "is_active"
             FROM interview_questions 
             WHERE is_active = true 
             ORDER BY category ASC, question_order ASC`
        );
        return result.rows;
    }

    static async create(data) {
        // Map any camelCase to snake_case just in case, but prioritize snake_case
        const mapped = {
            category: data.category,
            instructions: data.instructions,
            question_text: data.question_text || data.questionText,
            question_type: data.question_type || data.questionType || 'initial',
            answer_type: data.answer_type || data.answerType || 'text',
            is_required: data.is_required ?? data.isRequired ?? true,
            question_order: data.question_order ?? data.questionOrder ?? 0,
            options: data.options ? (typeof data.options === 'string' ? data.options : JSON.stringify(data.options)) : null,
            max_rating: data.max_rating ?? data.maxRating ?? 5,
            is_active: true
        };
        const build = buildInsert('interview_questions', mapped);
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async update(id, data) {
        const mapped = {};
        if (data.category !== undefined) mapped.category = data.category;
        if (data.instructions !== undefined) mapped.instructions = data.instructions;
        if (data.question_text !== undefined || data.questionText !== undefined) 
            mapped.question_text = data.question_text ?? data.questionText;
        if (data.question_type !== undefined || data.questionType !== undefined) 
            mapped.question_type = data.question_type ?? data.questionType;
        if (data.answer_type !== undefined || data.answerType !== undefined) 
            mapped.answer_type = data.answer_type ?? data.answerType;
        if (data.is_required !== undefined || data.isRequired !== undefined) 
            mapped.is_required = data.is_required ?? data.isRequired;
        if (data.question_order !== undefined || data.questionOrder !== undefined) 
            mapped.question_order = data.question_order ?? data.questionOrder;
        if (data.options !== undefined) 
            mapped.options = typeof data.options === 'string' ? data.options : JSON.stringify(data.options);
        if (data.max_rating !== undefined || data.maxRating !== undefined)
            mapped.max_rating = data.max_rating ?? data.maxRating;
        if (data.is_active !== undefined || data.isActive !== undefined) 
            mapped.is_active = data.is_active ?? data.isActive;

        const build = buildUpdate('interview_questions', mapped, id);
        if (!build) return null;
        const result = await query(build.text, build.values);
        return result.rows[0];
    }

    static async delete(id) {
        // Logical delete
        await query('UPDATE interview_questions SET is_active = false WHERE id = $1', [id]);
    }
}
