import { useState, useMemo, useEffect, useRef } from 'react';
import { MhrtService, type TimeOffMapping } from '@/services/MhrtService';
import { MAPPING_DATA } from '../constants/timeOffConstants';

export function useTimeOff() {
    const [searchTerm, setSearchTerm] = useState('');
    const [mappings, setMappings] = useState<TimeOffMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMapping, setEditingMapping] = useState<TimeOffMapping | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<TimeOffMapping>>({});

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [startWinY, setStartWinY] = useState(0);

    const fetchAssignments = async () => {
        try {
            setIsLoading(true);
            const data = await MhrtService.getTimeOff();
            setMappings(data.length > 0 ? data : MAPPING_DATA);
        } catch (error) {
            console.error('Failed to fetch time-off:', error);
            setMappings(MAPPING_DATA);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    const handleAdd = () => {
        setEditingMapping(null);
        setFormData({ locationGroup: '', assignedRoles: '' });
        setIsFormOpen(true);
    };

    const handleEdit = (m: TimeOffMapping) => {
        setEditingMapping(m);
        setFormData(m);
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formData.locationGroup) return;

        try {
            if (editingMapping) {
                const updated = await MhrtService.updateTimeOff(editingMapping.id, formData);
                setMappings(prev => prev.map(m => m.id === editingMapping.id ? updated : m));
            } else {
                const created = await MhrtService.createTimeOff(formData);
                setMappings(prev => [...prev, created]);
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error('Failed to save assignment:', error);
        }
    };

    const handleDelete = async () => {
        if (deletingId) {
            try {
                await MhrtService.deleteTimeOff(deletingId);
                setMappings(prev => prev.filter(m => m.id !== deletingId));
                setDeletingId(null);
            } catch (error) {
                console.error('Failed to delete assignment:', error);
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

    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walkX = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walkX;
        const deltaY = (e.pageY - startY) * 1.5;
        window.scrollTo(0, startWinY - deltaY);
    };

    const filteredData = useMemo(() => {
        if (!searchTerm) return mappings;
        const s = searchTerm.toLowerCase();
        return mappings.filter(item =>
            item.locationGroup.toLowerCase().includes(s) ||
            item.assignedRoles.toLowerCase().includes(s)
        );
    }, [mappings, searchTerm]);

    return {
        searchTerm, setSearchTerm,
        mappings, isLoading,
        isFormOpen, setIsFormOpen,
        editingMapping,
        deletingId, setDeletingId,
        formData, setFormData,
        scrollRef, isDragging,
        handleAdd, handleEdit, handleSave, handleDelete,
        handleMouseDown, handleMouseUp, handleMouseMove,
        filteredData
    };
}
