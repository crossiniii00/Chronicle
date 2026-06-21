import { useState, useMemo, useEffect, useRef } from 'react';
import { MhrtService, type H2RRecord } from '@/services/MhrtService';
import { REAL_H2R } from '../constants/h2rConstants';

export function useH2R() {
    const [searchTerm, setSearchTerm] = useState('');
    const [records, setRecords] = useState<H2RRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<H2RRecord | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<H2RRecord>>({});

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [startWinY, setStartWinY] = useState(0);

    const fetchH2R = async () => {
        try {
            setIsLoading(true);
            const data = await MhrtService.getH2R();
            setRecords(data.length > 0 ? data : REAL_H2R);
        } catch (error) {
            console.error('Failed to fetch H2R:', error);
            setRecords(REAL_H2R);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchH2R();
    }, []);

    const handleAdd = () => {
        setEditingRecord(null);
        setFormData({
            division: 'Operations Direct',
            training: '2 weeks',
            nesting: '2 weeks'
        });
        setIsFormOpen(true);
    };

    const handleEdit = (rec: H2RRecord) => {
        setEditingRecord(rec);
        setFormData(rec);
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formData.account) return;

        try {
            if (editingRecord) {
                const updated = await MhrtService.updateH2R(editingRecord.id, formData);
                setRecords(prev => prev.map(r => r.id === editingRecord.id ? updated : r));
            } else {
                const created = await MhrtService.createH2R(formData);
                setRecords(prev => [created, ...prev]);
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error('Failed to save H2R:', error);
        }
    };

    const handleDelete = async () => {
        if (deletingId) {
            try {
                await MhrtService.deleteH2R(deletingId);
                setRecords(prev => prev.filter(r => r.id !== deletingId));
                setDeletingId(null);
            } catch (error) {
                console.error('Failed to delete H2R:', error);
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
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walkX = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walkX;
        const deltaY = (e.pageY - startY) * 1.5;
        window.scrollTo(0, startWinY - deltaY);
    };

    const filteredRecords = useMemo(() => {
        if (!searchTerm) return records;
        const s = searchTerm.toLowerCase();
        return records.filter(rec =>
            rec.account.toLowerCase().includes(s) ||
            rec.lob.toLowerCase().includes(s) ||
            rec.jobLocation.toLowerCase().includes(s)
        );
    }, [records, searchTerm]);

    return {
        searchTerm, setSearchTerm,
        records, isLoading,
        isFormOpen, setIsFormOpen,
        editingRecord,
        deletingId, setDeletingId,
        formData, setFormData,
        scrollRef, isDragging,
        handleAdd, handleEdit, handleSave, handleDelete,
        handleMouseDown, handleMouseUp, handleMouseMove,
        filteredRecords
    };
}
