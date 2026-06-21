import { apiClient } from '@/utils/apiClient';

export interface InterviewQuestion {
    id: string;
    category?: string;
    instructions?: string;
    question_text: string;
    question_type: 'initial' | 'final' | 'technical' | 'behavioral';
    answer_type: 'text' | 'rating' | 'yes_no' | 'multiple_choice' | 'date';
    is_required: boolean;
    question_order: number;
    is_active: boolean;
    options?: string[];
    max_length?: number;
    max_rating?: number;
}

export const QuestionService = {
    getAll: async (): Promise<InterviewQuestion[]> => {
        const response = await apiClient.get('/interview-questions');
        return response.data.map((q: any) => ({
            id: q.id,
            category: q.category,
            instructions: q.instructions,
            question_text: q.questionText || q.question_text,
            question_type: q.questionType || q.question_type,
            answer_type: q.answerType || q.answer_type,
            is_required: q.isRequired ?? q.is_required,
            question_order: q.questionOrder ?? q.question_order,
            options: q.options,
            max_rating: q.maxRating || q.max_rating,
            is_active: q.is_active ?? true
        }));
    },

    add: async (question: Partial<InterviewQuestion>): Promise<InterviewQuestion> => {
        const response = await apiClient.post('/interview-questions', question);
        return response.data;
    },

    update: async (id: string, patch: Partial<InterviewQuestion>): Promise<InterviewQuestion> => {
        const response = await apiClient.patch(`/interview-questions/${id}`, patch);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/interview-questions/${id}`);
    }
};
