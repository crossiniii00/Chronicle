import { useState } from 'react';
import type { Application } from '@/types/application';
import { ApplicationService } from '@/services/ApplicationService';

interface NotesProps {
    applications: Application[];
    setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
    success: (title: string, message: string) => void;
    error: (title: string, message: string) => void;
}

export function useInterviewNotes({
    applications,
    setApplications,
    success,
    error
}: NotesProps) {
    const [notesApp, setNotesApp] = useState<Application | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    const handleSaveNote = async (appId: string, noteText: string, author: string) => {
        const app = applications.find(a => a.id === appId);
        if (!app) return;
  
        let notesArray: any[] = [];
        try {
            notesArray = JSON.parse(app.notes || '[]');
        } catch (e) {
            notesArray = app.notes ? [{ id: 'legacy', text: app.notes, author: 'System', createdAt: app.updated_at }] : [];
        }
  
        let updatedNotes;
        if (author === 'DELETE_TRIGGER_SYNC') {
            updatedNotes = JSON.stringify(notesArray.filter(n => n.id !== noteText));
        } else {
            const newNote = {
                id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: noteText,
                author,
                createdAt: new Date().toISOString()
            };
            updatedNotes = JSON.stringify([...notesArray, newNote]);
        }
        
        try {
            await ApplicationService.patch(appId, { notes: updatedNotes });
            setApplications(prev => prev.map(a => a.id === appId ? { ...a, notes: updatedNotes } : a));
            if (notesApp?.id === appId) {
                setNotesApp(prev => prev ? { ...prev, notes: updatedNotes } : null);
            }
            if (author === 'DELETE_TRIGGER_SYNC') {
                success('Note Deleted', 'Comment has been removed from the candidate dossier.');
            } else {
                success('Note Logged', 'Comment has been permanently attached to the candidate dossier.');
            }
        } catch (err) {
            error('Protocol Error', 'Failed to update notes.');
        }
    };

    return {
        notesApp,
        setNotesApp,
        anchorRect,
        setAnchorRect,
        handleSaveNote
    };
}
