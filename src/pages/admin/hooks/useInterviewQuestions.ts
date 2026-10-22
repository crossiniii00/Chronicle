import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    allow_notes: boolean;
    account: string;
    lob: string;
};

export function useInterviewQuestions(initialTab: 'initial' | 'final' = 'initial') {
    const { success, error: toastError } = useToast();
    const reorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [tab, setTab] = useState<'initial' | 'final'>(initialTab);
    const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
    const [selectedLob, setSelectedLob] = useState<string>('ALL');
    const [departments, setDepartments] = useState<Array<any>>([]);
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
        options: [],
        allow_notes: false,
        account: 'ALL',
        lob: 'ALL'
    });

    const loadQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const data = await QuestionService.getAll(true);
            setAllQuestions(data);
        } catch {
            toastError('Failed to load', 'Could not retrieve interview bank.');
        } finally {
            setLoading(false);
        }
    }, [toastError]);

    useEffect(() => {
        void loadQuestions();
        // Fetch accounts/departments
        import('@/services/DepartmentService').then(({ DepartmentService }) => {
            DepartmentService.getAll().then(setDepartments).catch(console.error);
        });
    }, [loadQuestions]);

    const accountToLobsMap = useMemo(() => {
        const map: Record<string, string[]> = {};
        departments.forEach((d: any) => {
            const name = (d.name || '').toUpperCase();
            const subs = d.subAccounts || d.sub_accounts || [];
            const lobNames = subs.map((s: any) => typeof s === 'string' ? s : s.name).filter(Boolean);
            map[name] = lobNames;
        });
        return map;
    }, [departments]);

    const questions = allQuestions
        .filter(q => q.question_type === tab)
        .filter(q => {
            if (selectedAccount !== 'ALL') {
                const qAcc = (q.account || 'ALL').toUpperCase();
                if (qAcc !== 'ALL' && qAcc !== selectedAccount.toUpperCase()) return false;
            }
            if (selectedLob !== 'ALL') {
                const qLob = (q.lob || 'ALL').toUpperCase();
                if (qLob !== 'ALL' && qLob !== selectedLob.toUpperCase()) return false;
            }
            return true;
        })
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
                is_required: form.answer_type === 'none' ? false : form.is_required,
                question_order: editingId ? (existingQuestion?.question_order || 0) : (questions.length + 1),
                is_active: true,
                allow_notes: form.allow_notes,
                account: form.account || 'ALL',
                lob: form.lob || 'ALL'
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
                options: [],
                allow_notes: false,
                account: 'ALL',
                lob: 'ALL'
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
            options: q.options || [],
            allow_notes: q.allow_notes ?? false,
            account: q.account || 'ALL',
            lob: q.lob || 'ALL'
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

    const handleReorder = (newOrder: InterviewQuestion[]) => {
        setAllQuestions(prev => {
            const otherTypeQs = prev.filter(q => q.question_type !== tab);
            const updatedOrder = newOrder.map((q, idx) => ({
                ...q,
                question_order: idx + 1
            }));
            return [...otherTypeQs, ...updatedOrder];
        });

        if (reorderTimeoutRef.current) {
            clearTimeout(reorderTimeoutRef.current);
        }

        reorderTimeoutRef.current = setTimeout(async () => {
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
        }, 1000);
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
        selectedAccount, setSelectedAccount,
        selectedLob, setSelectedLob,
        departments,
        accountToLobsMap,
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
