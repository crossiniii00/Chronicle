import React from 'react';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { BookOpen, Plus, Loader2, Trash2 } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { useInterviewQuestions, type QuestionForm } from './hooks/useInterviewQuestions';
import { QuestionHeader, QuestionTabNavigation, QuestionItem } from './components/InterviewQuestionsUI';
import type { InterviewQuestion } from '@/types';

export function InterviewQuestions() {
    const {
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
        handleDelete
    } = useInterviewQuestions();

    const initialQuestions = allQuestions.filter(q => q.question_type === 'initial');
    const finalQuestions = allQuestions.filter(q => q.question_type === 'final');
    const activeQuestions = allQuestions.filter(q => q.is_active);
    const requiredQuestions = allQuestions.filter(q => q.is_required);

    return (
        <div className="w-full pb-12">
            <QuestionHeader
                onAdd={() => { setForm(f => ({ ...f, question_type: tab })); setModal(true); }}
                totalCount={allQuestions.length}
                activeCount={activeQuestions.length}
            />

            <QuestionTabNavigation
                tab={tab}
                onTabChange={setTab}
                initialCount={initialQuestions.length}
                finalCount={finalQuestions.length}
            />

            <div className="flex flex-col gap-1.5 border-b border-surface-200 bg-white px-6 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] font-medium text-surface-500 tracking-[-0.005em] tabular-nums">
                    Showing {questions.length} {tab === 'initial' ? 'initial interview' : 'ops Val interview'} questions
                </p>
                <p className="text-[12px] font-medium text-surface-500 tracking-[-0.005em] tabular-nums">
                    Required {requiredQuestions.filter(q => q.question_type === tab).length} · Active {questions.filter(q => q.is_active).length}
                </p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-10 h-10 text-[#0078d4] animate-spin" />
                    <p className="text-[12px] font-medium text-surface-400 tracking-[-0.005em]">Loading question bank...</p>
                </div>
            ) : questions.length === 0 ? (
                <div className="text-center py-24 px-6">
                    <div className="w-16 h-16 bg-surface-50 rounded-sm border border-surface-200 flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <BookOpen size={28} className="text-surface-300" />
                    </div>
                    <h3 className="text-[14px] font-semibold text-surface-900 tracking-[-0.005em] mb-1.5">No questions found</h3>
                    <p className="text-surface-400 text-[12px] font-medium tracking-[-0.005em]">Add your first question to the {tab} interview bank.</p>
                </div>
            ) : (
                <Reorder.Group
                    axis="y"
                    values={questions}
                    onReorder={handleReorder}
                    className="grid grid-cols-1 gap-2.5 px-6 pt-5"
                >
                    {questions.map((q, i) => (
                        <QuestionItem
                            key={q.id}
                            q={q}
                            i={i}
                            toggleActive={toggleActive}
                            handleEditClick={handleEditClick}
                            setDelConfirm={setDelConfirm}
                        />
                    ))}
                </Reorder.Group>
            )}

            <Modal open={modal} onClose={() => { setModal(false); setEditingId(null); }} title={editingId ? "Edit Interview Question" : "Add Interview Question"} size="md">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[11px] font-semibold text-surface-500 tracking-[-0.005em] mb-1.5">Question category (group header)</label>
                            <input
                                type="text"
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                placeholder="e.g. Behavioral and competency-based interview"
                                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-sm text-sm text-surface-900 focus:outline-none focus:border-primary-500 transition-all font-medium placeholder:text-surface-300 tracking-[-0.005em]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-surface-500 tracking-[-0.005em] mb-1.5">Interview type</label>
                            <select value={form.question_type} onChange={e => setForm((f): QuestionForm => ({ ...f, question_type: e.target.value as InterviewQuestion['question_type'] }))}
                                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-sm text-sm text-surface-900 focus:outline-none focus:border-primary-500 transition-all font-medium tracking-[-0.005em]">
                                <option value="initial">Initial interview</option>
                                <option value="final">Ops Val interview</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-surface-500 tracking-[-0.005em] mb-1.5">Answer type</label>
                            <select value={form.answer_type} onChange={e => setForm((f): QuestionForm => ({ ...f, answer_type: e.target.value as InterviewQuestion['answer_type'] }))}
                                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-sm text-sm text-surface-900 focus:outline-none focus:border-primary-500 transition-all font-medium tracking-[-0.005em]">
                                {['text', 'rating', 'yes_no', 'multiple_choice', 'date'].map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-surface-500 tracking-[-0.005em] mb-1.5">Question text *</label>
                        <textarea value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                            rows={3} placeholder="Enter the interview question..."
                            className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-sm text-sm text-surface-900 resize-none focus:outline-none focus:border-primary-500 transition-all font-medium placeholder:text-surface-300 tracking-[-0.005em]" />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-surface-500 tracking-[-0.005em] mb-1.5">Instructions / guidelines (optional)</label>
                        <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                            rows={2} placeholder="Add sample probes or specific guidelines for the interviewer..."
                            className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-sm text-[12px] text-surface-600 resize-none focus:outline-none focus:border-primary-500 transition-all font-normal placeholder:text-surface-300 italic tracking-[-0.005em]" />
                    </div>

                    {form.answer_type === 'rating' && (
                        <div>
                            <label className="block text-[11px] font-semibold text-surface-500 tracking-[-0.005em] mb-1.5">Max scale rating (1 to 10)</label>
                            <input
                                type="number"
                                min={2}
                                max={10}
                                value={form.max_rating}
                                onChange={e => setForm(f => ({ ...f, max_rating: parseInt(e.target.value) || 5 }))}
                                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-sm text-sm text-surface-900 focus:outline-none focus:border-primary-500 transition-all font-medium tracking-[-0.005em]"
                            />
                        </div>
                    )}

                    {form.answer_type === 'yes_no' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-surface-500 tracking-[-0.005em] mb-1.5">Affirmative label (positive)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Yes"
                                    value={form.options[0] || ''}
                                    onChange={e => {
                                        const newOpts = [...form.options];
                                        if (newOpts.length < 1) newOpts.push(e.target.value);
                                        else newOpts[0] = e.target.value;
                                        setForm(f => ({ ...f, options: newOpts }));
                                    }}
                                    className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-sm text-sm text-surface-900 focus:outline-none focus:border-primary-500 transition-all font-medium tracking-[-0.005em]"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-surface-500 tracking-[-0.005em] mb-1.5">Negative label (negative)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. No"
                                    value={form.options[1] || ''}
                                    onChange={e => {
                                        const newOpts = [...form.options];
                                        while (newOpts.length < 2) newOpts.push('');
                                        newOpts[1] = e.target.value;
                                        setForm(f => ({ ...f, options: newOpts }));
                                    }}
                                    className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-sm text-sm text-surface-900 focus:outline-none focus:border-primary-500 transition-all font-medium tracking-[-0.005em]"
                                />
                            </div>
                        </div>
                    )}

                    {form.answer_type === 'multiple_choice' && (
                        <div className="space-y-3">
                            <label className="block text-[11px] font-semibold text-surface-500 tracking-[-0.005em]">Multiple choice options</label>
                            <div className="space-y-2">
                                {form.options.map((opt, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={e => {
                                                const newOpts = [...form.options];
                                                newOpts[idx] = e.target.value;
                                                setForm(f => ({ ...f, options: newOpts }));
                                            }}
                                            className="flex-1 px-4 py-2 bg-surface-50 border border-surface-200 rounded-sm text-sm text-surface-900 focus:outline-none focus:border-primary-500 transition-all font-medium tracking-[-0.005em]"
                                        />
                                        <button
                                            onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-sm"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setForm(f => ({ ...f, options: [...form.options, ''] }))}
                                        className="flex-1 py-2 border border-dashed border-surface-300 rounded-sm text-[11px] font-semibold text-surface-500 tracking-[-0.005em] hover:border-primary-500 hover:text-primary-600 transition-all"
                                    >
                                        + Add option
                                    </button>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, options: [...form.options, 'Other'] }))}
                                        className="px-4 py-2 bg-surface-100 border border-surface-200 rounded-sm text-[11px] font-semibold text-surface-600 tracking-[-0.005em] hover:bg-surface-200 transition-all"
                                    >
                                        + Add other
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 p-4 bg-surface-50 border border-surface-200 rounded-sm">
                        <input type="checkbox" id="req-check" checked={form.is_required} onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} className="w-4 h-4 rounded border-surface-200 accent-primary-600" />
                        <label htmlFor="req-check" className="text-[12px] font-medium text-surface-600 tracking-[-0.005em] cursor-pointer select-none">Question is required</label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                        <button onClick={() => { setModal(false); setEditingId(null); }} className="px-6 py-2.5 bg-white border border-surface-200 rounded-sm text-[12px] font-medium text-surface-600 tracking-[-0.005em] hover:text-surface-900 hover:bg-surface-50 transition-all">Cancel</button>
                        <button onClick={handleAdd} disabled={submitting} className="px-6 py-2.5 bg-[#0078d4] hover:bg-[#006cbf] rounded-sm text-[12px] font-medium text-white tracking-[-0.005em] shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {submitting ? 'Saving...' : 'Save question'}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog open={!!delConfirm} onClose={() => setDelConfirm(null)} onConfirm={handleDelete}
                title="Delete question?" message="This action will permanently remove this question from the bank." confirmText="Delete selection" />
        </div>
    );
}
