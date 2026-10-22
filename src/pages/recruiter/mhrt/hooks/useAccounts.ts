import { useState, useMemo, useEffect, useRef } from 'react';
import { MhrtService, type MHRTAccount } from '@/services/MhrtService';
import { REAL_ACCOUNTS } from '../constants/accountConstants';

export function useAccounts() {
    const [searchTerm, setSearchTerm] = useState('');
    const [accounts, setAccounts] = useState<MHRTAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<MHRTAccount | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<MHRTAccount>>({});

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [startWinY, setStartWinY] = useState(0);

    const fetchAccounts = async () => {
        try {
            setIsLoading(true);
            const data = await MhrtService.getAccounts();
            setAccounts(data.length > 0 ? data : REAL_ACCOUNTS);
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
            setAccounts(REAL_ACCOUNTS);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleAdd = () => {
        setEditingAccount(null);
        setFormData({
            ovStatus: 'Pending',
            voiceType: 'Multi',
            direction: 'Both',
            location: 'Beta'
        });
        setIsFormOpen(true);
    };

    const handleEdit = (acc: MHRTAccount) => {
        setEditingAccount(acc);
        setFormData(acc);
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formData.account) return;

        try {
            if (editingAccount) {
                const updated = await MhrtService.updateAccount(editingAccount.id, formData);
                setAccounts(prev => prev.map(a => a.id === editingAccount.id ? updated : a));
            } else {
                const created = await MhrtService.createAccount(formData);
                setAccounts(prev => [created, ...prev]);
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error('Failed to save account:', error);
        }
    };

    const handleInlineSave = async (id: string, field: keyof MHRTAccount, value: any) => {
        try {
            const updated = await MhrtService.updateAccount(id, { [field]: value });
            setAccounts(prev => prev.map(a => a.id === id ? updated : a));
        } catch (error) {
            console.error('Failed to inline save account:', error);
        }
    };

    const handleDelete = async () => {
        if (deletingId) {
            try {
                await MhrtService.deleteAccount(deletingId);
                setAccounts(prev => prev.filter(a => a.id !== deletingId));
                setDeletingId(null);
            } catch (error) {
                console.error('Failed to delete account:', error);
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

    const filteredAccounts = useMemo(() => {
        if (!searchTerm) return accounts;
        const s = searchTerm.toLowerCase();
        return accounts.filter(acc =>
            acc.account.toLowerCase().includes(s) ||
            acc.lob.toLowerCase().includes(s) ||
            acc.location.toLowerCase().includes(s)
        );
    }, [accounts, searchTerm]);

    return {
        searchTerm, setSearchTerm,
        accounts, isLoading,
        isFormOpen, setIsFormOpen,
        editingAccount, setEditingAccount,
        deletingId, setDeletingId,
        formData, setFormData,
        scrollRef, isDragging,
        handleAdd, handleEdit, handleSave, handleInlineSave, handleDelete,
        handleMouseDown, handleMouseUp, handleMouseMove,
        filteredAccounts
    };
}
