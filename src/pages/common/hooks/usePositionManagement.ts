import { useState, useEffect, useMemo } from 'react';
import { PositionService } from '@/services/PositionService';
import { ApplicationService } from '@/services/ApplicationService';
import { DepartmentService } from '@/services/DepartmentService';
import { JobCategoryService } from '@/services/JobCategoryService';
import { useToast } from '@/components/common/useToast';
import { useAuthStore } from '@/store/authStore';
import { useLoading } from '@/components/common/useLoading';
import type { Application, Position, JobCategory } from '@/types';

export type PositionForm = {
    title: string;
    department: string;
    description: string;
    qualifications: string;
    hiring_quota: number;
    employment_type: Position['employment_type'];
    location: string;
    work_arrangement: Position['work_arrangement'];
    time_limit_days: number;
    category_id: string | null;
};

export const EMPTY_POS: PositionForm = {
    title: '', department: '', description: '', qualifications: '', hiring_quota: 1,
    employment_type: 'Full-time', location: '', work_arrangement: 'Onsite',
    time_limit_days: 0,
    category_id: null,
};

export function usePositionManagement() {
    const { success } = useToast();
    const { user } = useAuthStore();
    const [search, setSearch] = useState('');
    const [viewType, setViewType] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('pos-view-type') as 'grid' | 'list') || 'grid';
    });

    useEffect(() => {
        localStorage.setItem('pos-view-type', viewType);
    }, [viewType]);
    const [activeTab, setActiveTab] = useState<'active' | 'logs'>('active');
    const [modal, setModal] = useState<'create' | 'edit' | null>(null);
    const [form, setForm] = useState<PositionForm>({ ...EMPTY_POS });
    const [confirmTarget, setConfirmTarget] = useState<Position | null>(null);
    const [viewPos, setViewPos] = useState<Position | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [allPositions, setAllPositions] = useState<Position[]>([]);
    const [allApplications, setAllApplications] = useState<Application[]>([]);
    const [allDepartments, setAllDepartments] = useState<{ id: string, name: string }[]>([]);
    const [accountFilter, setAccountFilter] = useState<string>('');
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);
    const [loading, setLoading] = useState(true);
    const { withLoading } = useLoading();
    const [pendingDelete, setPendingDelete] = useState<Position | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [deletingPositionId, setDeletingPositionId] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>('');

    // --- Category State ---
    const [categories, setCategories] = useState<JobCategory[]>([]);
    const [categoryModal, setCategoryModal] = useState<'create' | 'edit' | null>(null);
    const [categoryForm, setCategoryForm] = useState<{ name: string; description: string }>({ name: '', description: '' });
    const [editingCategory, setEditingCategory] = useState<JobCategory | null>(null);
    const [pendingDeleteCategory, setPendingDeleteCategory] = useState<JobCategory | null>(null);
    const [assignModal, setAssignModal] = useState<JobCategory | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fbPos, fbApps, depts, cats] = await Promise.all([
                PositionService.getAll(),
                ApplicationService.getAll(),
                DepartmentService.getAll(),
                JobCategoryService.getAll(),
            ]);
            setAllPositions(fbPos);
            setAllApplications(fbApps);
            setAllDepartments(depts || []);
            setCategories(cats || []);
            
            // Auto-select "All" view by clearing selectedAccount if it was set
            setSelectedAccount(null);
        } catch (err) {
            console.error('Failed to load data:', err);
            setAllPositions([]);
            setAllApplications([]);
            setAllDepartments([]);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    const departmentMetrics = useMemo(() => {
        const metrics: Record<string, { count: number; activeCount: number }> = {};
        
        allPositions.forEach(pos => {
            const dept = pos.department || 'Uncategorized';
            if (!metrics[dept]) {
                metrics[dept] = { count: 0, activeCount: 0 };
            }
            metrics[dept].count++;
            if (pos.status === 'OPEN') {
                metrics[dept].activeCount++;
            }
        });

        return allDepartments.map(dept => ({
            ...dept,
            count: metrics[dept.name]?.count || 0,
            activeCount: metrics[dept.name]?.activeCount || 0
        })).sort((a, b) => b.activeCount - a.activeCount);
    }, [allPositions, allDepartments]);

    const enrichedPositions = useMemo(() => {
        return allPositions.map(pos => {
            const hiredCount = allApplications.filter(app => 
                app.position_id === pos.id && 
                app.pis?.overall_status === 'HIRED' &&
                app.pis?.final_account === pos.department
            ).length;
            
            return {
                ...pos,
                current_hired: hiredCount,
                remaining_slots: Math.max(0, pos.hiring_quota - hiredCount)
            };
        });
    }, [allPositions, allApplications]);

    const positions = useMemo(() => {
        return enrichedPositions.filter(p => {
            const matchesSearch = !search ||
                p.title.toLowerCase().includes(search.toLowerCase()) ||
                (p.department || '').toLowerCase().includes(search.toLowerCase());
            const matchesTab = activeTab === 'active' ? p.status === 'OPEN' : p.status === 'CLOSED';
            const matchesAccount = !accountFilter || p.department === accountFilter;
            const matchesCategory = !categoryFilter || 
                (categoryFilter === '__uncategorized__' ? !p.category_id : p.category_id === categoryFilter);

            return matchesSearch && matchesTab && matchesAccount && matchesCategory;
        });
    }, [enrichedPositions, search, activeTab, accountFilter, categoryFilter]);

    const handleCreate = async () => {
        await withLoading(async () => {
            const posData = {
                ...form,
                current_hired: 0,
                remaining_slots: form.hiring_quota,
                status: 'OPEN' as const,
                created_at: new Date().toISOString(),
                created_by: user?.id || 'system',
                applicant_count: 0,
            };
            try {
                const newId = await PositionService.add(posData);
                if (newId) {
                    setAllPositions(prev => [...prev, { id: newId, ...posData } as Position]);
                    
                    if (selectedImageFile) {
                        try {
                            await handleImageUpload(newId, selectedImageFile);
                        } catch (e) {
                            console.error('Failed to upload image during creation', e);
                        }
                    }
                    
                    success('Position Created', `${form.title} is now posted.`);
                    setModal(null);
                    setForm({ ...EMPTY_POS });
                    setSelectedImageFile(null);
                }
            } catch (err) {
                console.error('Failed to create position:', err);
                throw err;
            }
        }, 'Posting position...');
    };

    const handleDelete = async (pos: Position) => {
        setDeletingPositionId(pos.id);
        try {
            await PositionService.delete(pos.id);
            setAllPositions(prev => prev.filter(p => p.id !== pos.id));
            success('Position Deleted', `${pos.title} has been removed.`);
        } catch (err) {
            console.error('Failed to delete position:', err);
        } finally {
            setDeletingPositionId(null);
            setPendingDelete(null);
        }
    };

    const toggleClose = async (pos: Position) => {
        const newStatus = pos.status === 'OPEN' ? 'CLOSED' : 'OPEN';
        const closedDate = pos.status === 'OPEN' ? new Date().toISOString() : undefined;
        await withLoading(async () => {
            try {
                await PositionService.update(pos.id, { status: newStatus, closed_date: closedDate || undefined });
                setAllPositions(prev => prev.map(p => p.id === pos.id ? { ...p, status: newStatus, closed_date: closedDate } : p));
                success(pos.status === 'OPEN' ? 'Position Closed' : 'Position Reopened', pos.title);
            } catch (err) {
                console.error('Failed to update position status:', err);
                throw err;
            }
        }, newStatus === 'CLOSED' ? 'Archiving position...' : 'Reopening position...');
    };

    const handleEdit = (pos: Position) => {
        setEditingPosition(pos);
        setForm({
            title: pos.title,
            department: pos.department,
            description: pos.description,
            qualifications: pos.qualifications,
            hiring_quota: pos.hiring_quota,
            employment_type: pos.employment_type,
            location: pos.location,
            work_arrangement: pos.work_arrangement,
            time_limit_days: pos.time_limit_days || 0,
            category_id: pos.category_id || null,
        });
        setModal('edit');
    };

    const handleUpdate = async () => {
        if (!editingPosition) return;
        await withLoading(async () => {
            try {
                const patch = { ...form };
                await PositionService.update(editingPosition.id, patch);
                
                setAllPositions(prev => prev.map(p => p.id === editingPosition.id ? { ...p, ...patch } as Position : p));

                if (selectedImageFile) {
                    try {
                        await handleImageUpload(editingPosition.id, selectedImageFile);
                    } catch (e) {
                        console.error('Failed to upload image during update', e);
                    }
                }
                
                success('Position Updated', `${form.title} has been updated.`);
                setModal(null);
                setEditingPosition(null);
                setForm({ ...EMPTY_POS });
                setSelectedImageFile(null);
            } catch (err) {
                console.error('Failed to update position:', err);
                throw err;
            }
        }, 'Saving changes...');
    };

    const handleImageUpload = async (posId: string, file: File) => {
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/positions/${posId}/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await res.json();
            
            setAllPositions(prev => prev.map(p => 
                p.id === posId ? { ...p, image_url: data.imageUrl, imageUrl: data.imageUrl } as Position : p
            ));
            
            success('Image Uploaded', 'Position image successfully updated.');
        } catch (err) {
            console.error('Failed to upload image:', err);
            throw err;
        }
    };

    const groupedPositions = useMemo(() => {
        return positions.reduce((acc, pos) => {
            const dept = pos.department || 'Uncategorized';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(pos);
            return acc;
        }, {} as Record<string, Position[]>);
    }, [positions]);

    const sortedAccounts = useMemo(() => Object.keys(groupedPositions).sort(), [groupedPositions]);

    const positionApplicants = viewPos
        ? allApplications.filter(app => app.position_id === viewPos.id)
        : [];

    // --- Category CRUD ---
    const handleCreateCategory = async () => {
        if (!categoryForm.name.trim()) return;
        try {
            const newCat = await JobCategoryService.create({
                name: categoryForm.name.trim(),
                description: categoryForm.description.trim() || undefined,
                sort_order: categories.length,
            });
            setCategories(prev => [...prev, newCat]);
            setCategoryForm({ name: '', description: '' });
            setCategoryModal(null);
            success('Category Created', `"${newCat.name}" is ready.`);
        } catch (err: any) {
            console.error('Failed to create category:', err);
            if (err?.response?.status === 409) {
                alert('A category with that name already exists.');
            }
        }
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory || !categoryForm.name.trim()) return;
        try {
            const updated = await JobCategoryService.update(editingCategory.id, {
                name: categoryForm.name.trim(),
                description: categoryForm.description.trim(),
            });
            setCategories(prev => prev.map(c => c.id === editingCategory.id ? updated : c));
            setCategoryForm({ name: '', description: '' });
            setEditingCategory(null);
            setCategoryModal(null);
            success('Category Updated', `"${updated.name}" has been updated.`);
        } catch (err: any) {
            console.error('Failed to update category:', err);
            if (err?.response?.status === 409) {
                alert('A category with that name already exists.');
            }
        }
    };

    const handleDeleteCategory = async (cat: JobCategory) => {
        try {
            await JobCategoryService.delete(cat.id);
            setCategories(prev => prev.filter(c => c.id !== cat.id));
            // Revert positions in that category to uncategorized (frontend state)
            setAllPositions(prev => prev.map(p => p.category_id === cat.id ? { ...p, category_id: null } : p));
            setPendingDeleteCategory(null);
            success('Category Deleted', `"${cat.name}" removed. Postings reverted to Uncategorized.`);
        } catch (err) {
            console.error('Failed to delete category:', err);
        }
    };

    const handleEditCategory = (cat: JobCategory) => {
        setEditingCategory(cat);
        setCategoryForm({ name: cat.name, description: cat.description || '' });
        setCategoryModal('edit');
    };

    const handleAssignPositions = async (categoryId: string, positionIds: string[]) => {
        try {
            await JobCategoryService.assignPositions(categoryId, positionIds);
            setAllPositions(prev => prev.map(p => 
                positionIds.includes(p.id) ? { ...p, category_id: categoryId } : p
            ));
            setAssignModal(null);
            success('Postings Assigned', `${positionIds.length} posting(s) moved.`);
        } catch (err) {
            console.error('Failed to assign positions:', err);
        }
    };

    const handleUnassignPosition = async (positionId: string) => {
        try {
            await PositionService.update(positionId, { category_id: null });
            setAllPositions(prev => prev.map(p =>
                p.id === positionId ? { ...p, category_id: null } : p
            ));
        } catch (err) {
            console.error('Failed to unassign position:', err);
        }
    };

    return {
        user,
        search, setSearch,
        viewType, setViewType,
        activeTab, setActiveTab,
        modal, setModal,
        form, setForm,
        confirmTarget, setConfirmTarget,
        viewPos, setViewPos,
        selectedAccount, setSelectedAccount,
        allPositions,
        allApplications,
        allDepartments,
        accountFilter, setAccountFilter,
        editingPosition, setEditingPosition,
        loading,
        pendingDelete, setPendingDelete,
        deletingPositionId,
        loadData,
        departmentMetrics,
        positions,
        handleCreate,
        handleDelete,
        toggleClose,
        handleEdit,
        handleUpdate,
        handleImageUpload,
        groupedPositions,
        sortedAccounts,
        positionApplicants,
        selectedImageFile, setSelectedImageFile,

        // Filter exports
        categoryFilter, setCategoryFilter,

        // Category exports
        categories,
        categoryModal, setCategoryModal,
        categoryForm, setCategoryForm,
        editingCategory, setEditingCategory,
        pendingDeleteCategory, setPendingDeleteCategory,
        assignModal, setAssignModal,
        handleCreateCategory,
        handleUpdateCategory,
        handleDeleteCategory,
        handleEditCategory,
        handleAssignPositions,
        handleUnassignPosition,
    };
}
