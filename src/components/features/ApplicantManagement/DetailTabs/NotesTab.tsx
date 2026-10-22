import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Calendar, User as UserIcon } from 'lucide-react';
import type { Application } from '@/types/application';
import { ApplicationService } from '@/services/ApplicationService';
import { useAuthStore } from '@/store/authStore';

export interface NoteItem {
    id: string;
    content: string;
    created_at: string;
    created_by: string;
}

interface NotesTabProps {
    applicant: Application;
    isEditing: boolean;
    handleUpdateApplication?: (id: string, updates: Partial<Application>) => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({ applicant, isEditing, handleUpdateApplication }) => {
    const { user } = useAuthStore();
    const metadata = applicant.metadata || {};
    const notesHistory: NoteItem[] = metadata.notes_history || [];

    const [isAdding, setIsAdding] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (updatedNotes: NoteItem[]) => {
        setIsSaving(true);
        try {
            const updatedMetadata = {
                ...metadata,
                notes_history: updatedNotes
            };

            await ApplicationService.patch(applicant.id, { metadata: updatedMetadata });

            if (handleUpdateApplication) {
                handleUpdateApplication(applicant.id, { metadata: updatedMetadata });
            }
        } catch (error) {
            console.error('Failed to update notes:', error);
            alert('Failed to update notes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;

        const newEntry: NoteItem = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            content: newNote.trim(),
            created_at: new Date().toISOString(),
            created_by: user?.full_name || 'Unknown User'
        };

        const updatedNotes = [newEntry, ...notesHistory];
        handleSave(updatedNotes);
        setNewNote('');
        setIsAdding(false);
    };

    const handleDeleteNote = (id: string) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        const updatedNotes = notesHistory.filter(n => n.id !== id);
        handleSave(updatedNotes);
    };

    const handleEditSave = (id: string) => {
        if (!editContent.trim()) return;
        
        const updatedNotes = notesHistory.map(n => 
            n.id === id 
                ? { ...n, content: editContent.trim(), updated_at: new Date().toISOString(), updated_by: user?.full_name || 'Unknown User' } 
                : n
        );
        handleSave(updatedNotes);
        setEditingId(null);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 p-6 gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight uppercase text-[#323130] dark:text-slate-300">Notes & Remarks</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1.5 h-8 px-4 text-sm font-semibold bg-[#0078d4] hover:bg-[#106ebe] text-white transition-all rounded-[2px]"
                >
                    <Plus size={14} /> Add Note
                </button>
            </div>

            {isAdding && (
                <div className="bg-[#faf9f8] border border-[#e1dfdd] p-4 rounded-sm animate-in fade-in slide-in-from-top-2">
                    <textarea
                        className="w-full h-32 p-3 border border-[#e1dfdd] rounded-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-[#0078d4] resize-none text-sm"
                        placeholder="Type your note or remark here..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        autoFocus
                    />
                    <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-1.5 text-sm font-medium border border-[#e1dfdd] bg-white dark:bg-slate-900 hover:bg-[#f3f2f1] rounded-[2px]"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddNote}
                            disabled={isSaving || !newNote.trim()}
                            className="px-4 py-1.5 text-sm font-medium bg-[#0078d4] text-white hover:bg-[#106ebe] rounded-[2px] disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-4">
                {notesHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[#e1dfdd] rounded-sm bg-[#faf9f8]">
                        <p className="text-sm text-[#605e5c] dark:text-slate-400">No notes or remarks have been added yet.</p>
                    </div>
                ) : (
                    notesHistory.map((note) => (
                        <div key={note.id} className="group flex flex-col p-4 border border-[#e1dfdd] rounded-sm hover:border-[#c8c6c4] dark:border-slate-700 transition-colors bg-white dark:bg-slate-900">
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#f3f2f1]">
                                <div className="flex items-center gap-4 text-xs text-[#605e5c] dark:text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <UserIcon size={12} className="text-[#0078d4]" />
                                        <span className="font-semibold text-[#323130] dark:text-slate-300">{note.created_by}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={12} />
                                        <span>{new Date(note.created_at).toLocaleString()}</span>
                                    </div>
                                    {(note as any).updated_at && (
                                        <span className="italic opacity-70">(Edited)</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                                        className="p-1.5 text-[#605e5c] dark:text-slate-400 hover:bg-[#f3f2f1] hover:text-[#0078d4] rounded-sm"
                                        title="Edit note"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="p-1.5 text-[#605e5c] dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-sm"
                                        title="Delete note"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            {editingId === note.id ? (
                                <div className="flex flex-col gap-3">
                                    <textarea
                                        className="w-full h-32 p-3 border border-[#0078d4] rounded-sm bg-white dark:bg-slate-900 focus:outline-none resize-none text-sm"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="p-1.5 text-[#605e5c] dark:text-slate-400 hover:bg-[#f3f2f1] rounded-sm"
                                        >
                                            <X size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleEditSave(note.id)}
                                            disabled={!editContent.trim()}
                                            className="p-1.5 text-[#0078d4] hover:bg-blue-50 rounded-sm disabled:opacity-50"
                                        >
                                            <Save size={16} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-[#323130] dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {note.content}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
