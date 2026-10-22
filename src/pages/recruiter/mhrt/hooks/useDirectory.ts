import { useState, useMemo, useEffect, useRef } from 'react';
import { MhrtService, type DirectoryEntry } from '@/services/MhrtService';
import { DIRECTORY_DATA } from '../constants/directoryConstants';

export function useDirectory() {
    const [searchTerm, setSearchTerm] = useState('');
    const [entries, setEntries] = useState<DirectoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DirectoryEntry | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<DirectoryEntry>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [startWinY, setStartWinY] = useState(0);

    const fetchDirectory = async () => {
        try {
            setIsLoading(true);
            const data = await MhrtService.getDirectory();
            setEntries(data.length > 0 ? data : DIRECTORY_DATA);
        } catch (error) {
            console.error('Failed to fetch directory:', error);
            setEntries(DIRECTORY_DATA);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDirectory();
    }, []);

    const handleAdd = () => {
        setEditingItem(null);
        setFormData({ account: '', team: '', distro: '', name: 'N/A' });
        setIsFormOpen(true);
    };

    const handleEdit = (entry: DirectoryEntry) => {
        setEditingItem(entry);
        setFormData(entry);
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formData.account || !formData.distro) return;

        try {
            if (editingItem) {
                const updated = await MhrtService.updateDirectory(editingItem.id, formData);
                setEntries(prev => prev.map(e => e.id === editingItem.id ? updated : e));
            } else {
                const created = await MhrtService.createDirectory(formData);
                setEntries(prev => [created, ...prev]);
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error('Failed to save entry:', error);
        }
    };

    const handleDelete = async () => {
        if (deletingId) {
            try {
                await MhrtService.deleteDirectory(deletingId);
                setEntries(prev => prev.filter(e => e.id !== deletingId));
                setDeletingId(null);
            } catch (error) {
                console.error('Failed to delete entry:', error);
            }
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
        setStartY(e.pageY);
        setStartWinY(window.scrollY);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (scrollRef.current) {
            setTimeout(() => {
                if (scrollRef.current) delete scrollRef.current.dataset.dragging;
            }, 50);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walkX = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walkX;
        const deltaY = (e.pageY - startY) * 1.5;
        window.scrollTo(0, startWinY - deltaY);
        
        if (Math.abs(walkX) > 5 || Math.abs(deltaY) > 5) {
            scrollRef.current.dataset.dragging = "true";
        }
    };

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredData = useMemo(() => {
        const s = searchTerm.toLowerCase();
        return entries.filter(item =>
            item.account.toLowerCase().includes(s) ||
            item.team.toLowerCase().includes(s) ||
            item.distro.toLowerCase().includes(s)
        );
    }, [entries, searchTerm]);

    return {
        searchTerm, setSearchTerm,
        entries, isLoading,
        isFormOpen, setIsFormOpen,
        editingItem,
        deletingId, setDeletingId,
        formData, setFormData,
        copiedId,
        scrollRef, isDragging,
        handleAdd, handleEdit, handleSave, handleDelete,
        handleMouseDown, handleMouseUp, handleMouseMove,
        handleCopy, filteredData
    };
}
