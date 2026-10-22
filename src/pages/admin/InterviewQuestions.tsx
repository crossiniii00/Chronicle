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
        handleDelete
    } = useInterviewQuestions();

    const initialQuestions = allQuestions.filter(q => q.question_type === 'initial');
    const finalQuestions = allQuestions.filter(q => q.question_type === 'final');
    const activeQuestions = allQuestions.filter(q => q.is_active);
    const requiredQuestions = allQuestions.filter(q => q.is_required);

    const modalAvailableLobs = form.account && form.account !== 'ALL' ? (accountToLobsMap[form.account.toUpperCase()] || []) : [];

    return (
        <div className="w-full pb-12">
            <QuestionHeader
                onAdd={() => { setForm(f => ({ ...f, question_type: tab, account: selectedAccount, lob: selectedLob })); setModal(true); }}
                totalCount={allQuestions.length}
                activeCount={activeQuestions.length}
                selectedAccount={selectedAccount}
                setSelectedAccount={setSelectedAccount}
                selectedLob={selectedLob}
                setSelectedLob={setSelectedLob}
                departments={departments}
                accountToLobsMap={accountToLobsMap}
            />

            <QuestionTabNavigation
                tab={tab}
                onTabChange={setTab}
                initialCount={initialQuestions.length}
                finalCount={finalQuestions.length}
            />

            <div className="flex flex-col gap-1.5 border-b border-surface-200 bg-white dark:bg-slate-900 px-6 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] font-medium text-surface-500 tracking-[-0.005em] tabular-nums">
                    Showing {questions.length} {tab === 'initial' ? 'initial interview' : 'ops Val interview'} questions {selectedAccount !== 'ALL' && `for ${selectedAccount}`} {selectedLob !== 'ALL' && `(LOB: ${selectedLob})`}
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
                    <div className="w-16 h-16 bg-surface-50 rounded-none border border-surface-200 flex items-center justify-center mx-auto mb-5 shadow-inner">
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

            <Modal open={modal} onClose={() => { setModal(false); setEditingId(null); }} title={editingId ? "Edit Interview Question" : "Add Interview Question"} size="2xl">
                <div className="flex flex-col">
                    <div className="grid grid-cols-2 gap-6 p-2">
                        
                        {/* LEFT COLUMN: Question Details */}
                        <div className="flex flex-col gap-5">
                            <h4 className="text-[13px] font-bold text-surface-900 uppercase tracking-wider border-b border-surface-100 pb-2">Question Details</h4>
                            
                            <div>
                                <label className="block text-[13px] font-medium text-surface-500 mb-1.5">Question text <span className="text-red-400">*</span></label>
                                <textarea value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                                    rows={4} placeholder="Enter the interview question..."
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-900 resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow placeholder:text-surface-300" />
                            </div>

                            <div>
                                <label className="block text-[13px] font-medium text-surface-500 mb-1.5">Answer format</label>
                                <select value={form.answer_type} onChange={e => setForm((f): QuestionForm => ({ ...f, answer_type: e.target.value as InterviewQuestion['answer_type'] }))}
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-900 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow">
                                    {['text', 'rating', 'yes_no', 'multiple_choice', 'date', 'none'].map(t => <option key={t} value={t} className="capitalize">{t === 'none' ? 'None (Introductory Text)' : t.replace('_', ' ')}</option>)}
                                </select>
                            </div>

                            {/* Answer format specific configurations */}
                            {form.answer_type === 'rating' && (
                                <div className="pl-4 border-l-2 border-[#0078d4]/20 py-1">
                                    <label className="block text-[13px] font-medium text-surface-500 mb-1.5">Max scale rating (1 to 10)</label>
                                    <input
                                        type="number" min={2} max={10} value={form.max_rating}
                                        onChange={e => setForm(f => ({ ...f, max_rating: parseInt(e.target.value) || 5 }))}
                                        className="w-full max-w-[200px] px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-900 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow"
                                    />
                                </div>
                            )}

                            {form.answer_type === 'yes_no' && (
                                <div className="grid grid-cols-2 gap-5 pl-4 border-l-2 border-[#0078d4]/20 py-1">
                                    <div>
                                        <label className="block text-[13px] font-medium text-surface-500 mb-1.5">Affirmative label</label>
                                        <input type="text" placeholder="e.g. Yes" value={form.options[0] || ''}
                                            onChange={e => {
                                                const newOpts = [...form.options];
                                                if (newOpts.length < 1) newOpts.push(e.target.value);
                                                else newOpts[0] = e.target.value;
                                                setForm(f => ({ ...f, options: newOpts }));
                                            }}
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-900 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-medium text-surface-500 mb-1.5">Negative label</label>
                                        <input type="text" placeholder="e.g. No" value={form.options[1] || ''}
                                            onChange={e => {
                                                const newOpts = [...form.options];
                                                while (newOpts.length < 2) newOpts.push('');
                                                newOpts[1] = e.target.value;
                                                setForm(f => ({ ...f, options: newOpts }));
                                            }}
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-900 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow"
                                        />
                                    </div>
                                </div>
                            )}

                            {form.answer_type === 'multiple_choice' && (
                                <div className="pl-4 border-l-2 border-[#0078d4]/20 py-1 space-y-3">
                                    <label className="block text-[13px] font-medium text-surface-500">Multiple choice options</label>
                                    <div className="space-y-2">
                                        {form.options.map((opt, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input type="text" value={opt}
                                                    onChange={e => {
                                                        const newOpts = [...form.options];
                                                        newOpts[idx] = e.target.value;
                                                        setForm(f => ({ ...f, options: newOpts }));
                                                    }}
                                                    className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-900 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow"
                                                />
                                                <button onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))}
                                                    className="px-3 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-none transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex gap-3 pt-1">
                                            <button onClick={() => setForm(f => ({ ...f, options: [...form.options, ''] }))}
                                                className="text-[13px] font-medium text-[#0078d4] hover:underline flex items-center gap-1">
                                                <Plus size={14} /> Add option
                                            </button>
                                            <span className="text-surface-300">|</span>
                                            <button onClick={() => setForm(f => ({ ...f, options: [...form.options, 'Other'] }))}
                                                className="text-[13px] font-medium text-[#0078d4] hover:underline">
                                                Add 'Other'
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[13px] font-medium text-surface-500 mb-1.5">Instructions / guidelines for interviewer (optional)</label>
                                <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                                    rows={3} placeholder="Add sample probes or specific guidelines..."
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-700 resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow placeholder:text-surface-300 italic" />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Targeting & Options */}
                        <div className="flex flex-col h-full">
                            <div className="flex flex-col gap-5">
                                <h4 className="text-[13px] font-bold text-surface-900 uppercase tracking-wider border-b border-surface-100 pb-2">Targeting & Organization</h4>
                                
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2">
                                        <label className="block text-[13px] font-medium text-surface-500 mb-1.5 flex items-center gap-1.5">
                                            <BookOpen size={14} className="text-[#0078d4]" />
                                            Category (Group header)
                                        </label>
                                        <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                            placeholder="e.g. Behavioral"
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-900 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow placeholder:text-surface-300"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[13px] font-medium text-surface-500 mb-1.5">Interview stage</label>
                                        <select value={form.question_type} onChange={e => setForm((f): QuestionForm => ({ ...f, question_type: e.target.value as InterviewQuestion['question_type'] }))}
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-900 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow">
                                            <option value="initial">Initial interview</option>
                                            <option value="final">Ops Val interview</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-medium text-surface-500 mb-1.5">Target Account</label>
                                        <select value={form.account || 'ALL'} onChange={e => setForm((f): QuestionForm => ({ ...f, account: e.target.value, lob: 'ALL' }))}
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-900 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow">
                                            <option value="ALL">All Accounts</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.name}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-medium text-surface-500 mb-1.5">Target LOB</label>
                                        <select value={form.lob || 'ALL'} onChange={e => setForm((f): QuestionForm => ({ ...f, lob: e.target.value }))}
                                            disabled={!form.account || form.account === 'ALL' || modalAvailableLobs.length === 0}
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm text-[14px] text-surface-900 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-shadow disabled:bg-surface-50 disabled:text-surface-400">
                                            <option value="ALL">All LOBs</option>
                                            {modalAvailableLobs.map(l => (
                                                <option key={l} value={l}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-6 flex flex-col gap-3.5">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={form.answer_type === 'none' ? false : form.is_required} onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} 
                                        disabled={form.answer_type === 'none'}
                                        className="w-4 h-4 border-surface-300 text-[#0078d4] focus:ring-[#0078d4] rounded-none cursor-pointer disabled:opacity-50" />
                                    <span className="text-[14px] text-surface-700 group-hover:text-surface-900 select-none">Question is required</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={form.allow_notes} onChange={e => setForm(f => ({ ...f, allow_notes: e.target.checked }))} 
                                        className="w-4 h-4 border-surface-300 text-[#0078d4] focus:ring-[#0078d4] rounded-none cursor-pointer" />
                                    <span className="text-[14px] text-surface-700 group-hover:text-surface-900 select-none">Include a notes text area for the interviewer</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-5 pb-1 border-t border-surface-100 mt-6 px-2">
                        <button onClick={() => { setModal(false); setEditingId(null); }} className="px-5 py-2 bg-white dark:bg-slate-900 border border-surface-200 rounded-none text-[14px] font-medium text-surface-600 hover:bg-surface-50 transition-colors">Cancel</button>
                        <button onClick={handleAdd} disabled={submitting} className="px-5 py-2 bg-[#0078d4] hover:bg-[#106ebe] rounded-none text-[14px] font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2">
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
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
