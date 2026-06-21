import { useState, useEffect, useCallback } from 'react';
import { QuestionService } from '@/services/QuestionService';
import { useToast } from '@/components/common/useToast';
import type { InterviewQuestion } from '@/types';

export type QuestionForm = {
    category: string;
    instructions: string;
    question_text: string;
    answer_type: InterviewQuestion['answer_type'];
    question_type: InterviewQuestion['question_type'];
    is_required: boolean;
    max_length: number;
    max_rating: number;
    options: string[];
};

export function useInterviewQuestions(initialTab: 'initial' | 'final' = 'initial') {
    const { success, error: toastError } = useToast();
    const [tab, setTab] = useState<'initial' | 'final'>(initialTab);
    const [modal, setModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [allQuestions, setAllQuestions] = useState<InterviewQuestion[]>([]);
    const [delConfirm, setDelConfirm] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<QuestionForm>({ 
        category: '',
        instructions: '',
        question_text: '', 
        answer_type: 'text', 
        question_type: initialTab, 
        is_required: true,
        max_length: 500,
        max_rating: 5,
        options: []
    });

    const loadQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const data = await QuestionService.getAll();
            setAllQuestions(data);
        } catch {
            toastError('Failed to load', 'Could not retrieve interview bank.');
        } finally {
            setLoading(false);
        }
    }, [toastError]);

    useEffect(() => {
        void loadQuestions();
    }, [loadQuestions]);

    const questions = allQuestions
        .filter(q => q.question_type === tab)
        .sort((a, b) => (a.question_order || 0) - (b.question_order || 0));

    const handleAdd = async () => {
        if (!form.question_text.trim()) {
            toastError('Required Field', 'Please enter the question text.');
            return;
        }
        setSubmitting(true);
        try {
            const existingQuestion = editingId ? allQuestions.find(q => q.id === editingId) : null;
            const payload = {
                category: form.category,
                instructions: form.instructions,
                question_type: form.question_type,
                question_text: form.question_text,
                answer_type: form.answer_type,
                max_length: form.answer_type === 'text' ? form.max_length : undefined,
                max_rating: form.answer_type === 'rating' ? form.max_rating : undefined,
                options: (form.answer_type === 'multiple_choice' || form.answer_type === 'yes_no') ? form.options : undefined,
                is_required: form.is_required,
                question_order: editingId ? (existingQuestion?.question_order || 0) : (questions.length + 1),
                is_active: true,
            };

            if (editingId) {
                await QuestionService.update(editingId, payload);
                success('Question Updated', 'Changes have been saved successfully.');
            } else {
                await QuestionService.add(payload);
                success('Question Added', 'New question has been added to the bank.');
            }

            setModal(false);
            setEditingId(null);
            setForm({ 
                category: '',
                instructions: '',
                question_text: '', 
                answer_type: 'text', 
                question_type: tab, 
                is_required: true, 
                max_length: 500, 
                max_rating: 5, 
                options: [] 
            });
            await loadQuestions();
        } catch {
            toastError(editingId ? 'Update Failed' : 'Addition Failed', 'Could not save question.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (q: InterviewQuestion) => {
        setEditingId(q.id);
        setForm({
            category: q.category || '',
            instructions: q.instructions || '',
            question_text: q.question_text,
            answer_type: q.answer_type,
            question_type: q.question_type,
            is_required: q.is_required,
            max_length: q.max_length || 500,
            max_rating: q.max_rating || 5,
            options: q.options || []
        });
        setModal(true);
    };

    const toggleActive = async (id: string, current: boolean) => {
        try {
            await QuestionService.update(id, { is_active: !current });
            setAllQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: !current } : q));
        } catch {
            toastError('Update Failed', 'Could not change question status.');
        }
    };

    const handleReorder = async (newOrder: InterviewQuestion[]) => {
        setAllQuestions(prev => {
            const otherTypeQs = prev.filter(q => q.question_type !== tab);
            const updatedOrder = newOrder.map((q, idx) => ({
                ...q,
                question_order: idx + 1
            }));
            return [...otherTypeQs, ...updatedOrder];
        });

        try {
            await Promise.all(
                newOrder.map((q, idx) => 
                    QuestionService.update(q.id, { question_order: idx + 1 })
                )
            );
        } catch {
            toastError('Sync Failed', 'Could not save the new arrangement.');
            void loadQuestions();
        }
    };

    const handleDelete = async () => {
        if (!delConfirm) return;
        try {
            await QuestionService.delete(delConfirm);
            success('Deleted', 'Question removed.');
            setAllQuestions(prev => prev.filter(q => q.id !== delConfirm));
        } catch {
            toastError('Delete Failed', 'Could not remove the question.');
        } finally {
            setDelConfirm(null);
        }
    };

    return {
        tab, setTab,
        modal, setModal,
        loading,
        submitting,
        allQuestions,
        questions,
        delConfirm, setDelConfirm,
        editingId, setEditingId,
        form, setForm,
        handleAdd,
        handleEditClick,
        toggleActive,
        handleReorder,
        handleDelete,
        loadQuestions
    };
}
