import { apiClient } from '@/utils/apiClient';

export interface InterviewQuestion {
    id: string;
    category?: string;
    instructions?: string;
    question_text: string;
    question_type: 'initial' | 'final' | 'technical' | 'behavioral';
    answer_type: 'text' | 'rating' | 'yes_no' | 'multiple_choice' | 'date' | 'none';
    is_required: boolean;
    question_order: number;
    is_active: boolean;
    options?: string[];
    max_length?: number;
    max_rating?: number;
    allow_notes?: boolean;
    account?: string;
    lob?: string;
}

export const QuestionService = {
    _cache: null as InterviewQuestion[] | null,
    _promise: null as Promise<InterviewQuestion[]> | null,

    getAll: async (forceRefresh = false): Promise<InterviewQuestion[]> => {
        if (!forceRefresh && QuestionService._cache) return QuestionService._cache;
        if (!forceRefresh && QuestionService._promise) return QuestionService._promise;
        
        QuestionService._promise = apiClient.get('/interview-questions').then(response => {
            const mapped = response.data.map((q: any) => ({
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
                is_active: q.is_active ?? true,
                allow_notes: q.allow_notes ?? false,
                account: q.account || 'ALL',
                lob: q.lob || 'ALL'
            }));
        QuestionService._cache = mapped;
        QuestionService._promise = null;
        return mapped;
    });
    return QuestionService._promise;
},

    add: async (question: Partial<InterviewQuestion>): Promise<InterviewQuestion> => {
        QuestionService._cache = null;
        const response = await apiClient.post('/interview-questions', question);
        return response.data;
    },

    update: async (id: string, patch: Partial<InterviewQuestion>): Promise<InterviewQuestion> => {
        QuestionService._cache = null;
        const response = await apiClient.patch(`/interview-questions/${id}`, patch);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        QuestionService._cache = null;
        await apiClient.delete(`/interview-questions/${id}`);
    },

    filterForApplication: (
        questions: InterviewQuestion[],
        accountName?: string,
        lobName?: string
    ): InterviewQuestion[] => {
        let parsedAccount = String(accountName || '').trim().toUpperCase();
        let parsedLob = String(lobName || '').trim().toUpperCase();

        if (parsedAccount.includes(' - ')) {
            const parts = parsedAccount.split(' - ');
            parsedAccount = parts[0].trim();
            if (!parsedLob) parsedLob = parts.slice(1).join(' - ').trim();
        } else if (parsedAccount.includes('-')) {
            const parts = parsedAccount.split('-');
            parsedAccount = parts[0].trim();
            if (!parsedLob) parsedLob = parts.slice(1).join('-').trim();
        }

        return questions.filter(q => {
            if (!q.is_active) return false;

            const qAcc = String(q.account || 'ALL').trim().toUpperCase();
            const qLob = String(q.lob || 'ALL').trim().toUpperCase();

            // Account matching:
            // If question requires a specific account (qAcc !== 'ALL'):
            // It matches ONLY IF parsedAccount is set AND matches qAcc.
            if (qAcc !== 'ALL') {
                if (!parsedAccount || parsedAccount === 'ALL') return false;
                const matchesAccount = (
                    qAcc === parsedAccount ||
                    parsedAccount.includes(qAcc) ||
                    qAcc.includes(parsedAccount)
                );
                if (!matchesAccount) return false;
            }

            // LOB matching:
            // If question requires a specific LOB (qLob !== 'ALL'):
            // It matches ONLY IF parsedLob is set AND matches qLob.
            if (qLob !== 'ALL') {
                if (!parsedLob || parsedLob === 'ALL') return false;
                const isEacMatch = (
                    (qLob.includes('EAC') || qLob.includes('EXTENDED ADHERENCE')) &&
                    (parsedLob.includes('EAC') || parsedLob.includes('EXTENDED ADHERENCE'))
                );
                const matchesLob = isEacMatch || (
                    qLob === parsedLob ||
                    parsedLob.includes(qLob) ||
                    qLob.includes(parsedLob)
                );
                if (!matchesLob) return false;
            }

            return true;
        });
    }
};
