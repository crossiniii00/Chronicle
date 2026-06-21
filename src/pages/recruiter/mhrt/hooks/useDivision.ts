import { useState, useMemo, useEffect, useRef } from 'react';
import { MhrtService, type DivisionMapping } from '@/services/MhrtService';
import { MAPPING_DATA } from '../constants/divisionConstants';

export function useDivision() {
    const [searchTerm, setSearchTerm] = useState('');
    const [mappings, setMappings] = useState<DivisionMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMapping, setEditingMapping] = useState<DivisionMapping | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<DivisionMapping>>({});

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [startWinY, setStartWinY] = useState(0);

    const fetchDivisions = async () => {
        try {
            setIsLoading(true);
            const data = await MhrtService.getDivisions();
            setMappings(data.length > 0 ? data : MAPPING_DATA);
        } catch (error) {
            console.error('Failed to fetch divisions:', error);
            setMappings(MAPPING_DATA);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDivisions();
    }, []);

    const handleAdd = () => {
        setEditingMapping(null);
        setFormData({ division: '', assignedRoles: '' });
        setIsFormOpen(true);
    };

    const handleEdit = (m: DivisionMapping) => {
        setEditingMapping(m);
        setFormData(m);
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formData.division) return;

        try {
            if (editingMapping) {
                const updated = await MhrtService.updateDivision(editingMapping.id, formData);
                setMappings(prev => prev.map(m => m.id === editingMapping.id ? updated : m));
            } else {
                const created = await MhrtService.createDivision(formData);
                setMappings(prev => [...prev, created]);
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error('Failed to save mapping:', error);
        }
    };

    const handleDelete = async () => {
        if (deletingId) {
            try {
                await MhrtService.deleteDivision(deletingId);
                setMappings(prev => prev.filter(m => m.id !== deletingId));
                setDeletingId(null);
            } catch (error) {
                console.error('Failed to delete mapping:', error);
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
            item.division.toLowerCase().includes(s) ||
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
