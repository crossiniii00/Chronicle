import React, { useState, useMemo } from 'react';
import { 
    Briefcase, MapPin, Monitor, ChevronRight, 
    Edit2, Trash2, Activity, Users, Clock, Globe,
    Building2, AlertCircle, Info, CheckCircle2, Search,
    MoreVertical, ExternalLink, Image as ImageIcon,
    FolderOpen, Plus, X, Check, ChevronDown
} from 'lucide-react';
import { usePositionManagement } from './hooks/usePositionManagement';
import { PositionHeader, PositionFilterBar, getBadgeClass, getTimeStatus } from './components/PositionManagementUI';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { cn } from '@/utils/formatters';
import type { Position, JobCategory } from '@/types';

export default function PositionManagement({ hideHeader = false }: { hideHeader?: boolean }) {
    const {
        positions,
        allDepartments,
        accountFilter,
        setAccountFilter,
        loading,
        search,
        setSearch,
        activeTab,
        setActiveTab,
        viewType,
        setViewType,
        handleCreate,
        handleUpdate,
        handleDelete,
        toggleClose,
        handleEdit,
        form,
        setForm,
        modal,
        setModal,
        viewPos,
        setViewPos,
        confirmTarget,
        setConfirmTarget,
        pendingDelete,
        setPendingDelete,
        handleImageUpload,
        selectedImageFile,
        setSelectedImageFile,
        editingPosition,

        // Category
        categories,
        categoryModal,
        setCategoryModal,
        categoryForm,
        setCategoryForm,
        editingCategory,
        pendingDeleteCategory,
        setPendingDeleteCategory,
        assignModal,
        setAssignModal,
        handleCreateCategory,
        handleUpdateCategory,
        handleDeleteCategory,
        handleEditCategory,
        handleAssignPositions,

        // Filters
        categoryFilter, setCategoryFilter,
    } = usePositionManagement();

    // Local state for assign modal multi-select
    const [assignSelected, setAssignSelected] = useState<Set<string>>(new Set());

    const handleOpenCreateModal = () => {
        setForm({
            title: '',
            description: '',
            department: '',
            qualifications: '',
            hiring_quota: 0, 
            employment_type: 'Full-time',
            location: 'Cebu City',
            work_arrangement: 'Onsite',
            time_limit_days: 0,
            category_id: null,
        });
        setModal('create');
    };

    const handleOpenCategoryModal = () => {
        setCategoryForm({ name: '', description: '' });
        setCategoryModal('create');
    };

    // STRICT FILTERING — must be before any early return to keep hooks in stable order
    const publicPositions = positions.filter(p => {
        const isInternal = p.title.includes('[INTERNAL]') || p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA');
        return !isInternal;
    });

    // Group positions by category
    const categoryMap = useMemo(() => {
        const map: Record<string, { category: JobCategory | null; positions: typeof publicPositions }> = {};
        
        // Initialize known categories
        categories.forEach(cat => {
            map[cat.id] = { category: cat, positions: [] };
        });
        
        // Add uncategorized bucket
        map['__uncategorized__'] = { category: null, positions: [] };
        
        publicPositions.forEach(pos => {
            const catId = pos.category_id;
            if (catId && map[catId]) {
                map[catId].positions.push(pos);
            } else {
                map['__uncategorized__'].positions.push(pos);
            }
        });
        
        return map;
    }, [publicPositions, categories]);

    // Build ordered category sections: named categories first (sorted by sort_order), then uncategorized
    const orderedSections = useMemo(() => {
        const sections: { key: string; name: string; category: JobCategory | null; positions: typeof publicPositions }[] = [];
        
        [...categories]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .forEach(cat => {
                const entry = categoryMap[cat.id];
                if (entry) {
                    sections.push({ key: cat.id, name: cat.name, category: cat, positions: entry.positions });
                }
            });
        
        // Always add uncategorized at the end
        const uncat = categoryMap['__uncategorized__'];
        if (uncat) {
            sections.push({ key: '__uncategorized__', name: 'Uncategorized', category: null, positions: uncat.positions });
        }
        
        return sections;
    }, [categoryMap, categories]);

    // Positions available for assigning (those NOT already in the target category)
    const availableForAssign = useMemo(() => {
        if (!assignModal) return [];
        return publicPositions.filter(p => p.category_id !== assignModal.id);
    }, [assignModal, publicPositions]);

    if (loading) {
                return (
                    <div className="flex flex-col items-center justify-center py-32 bg-white border border-[#edebe9] rounded-sm text-left">
                        <div className="w-8 h-8 border-2 border-[#0c2461] border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-xs font-medium text-[#605e5c]">Synchronizing Pipeline...</p>
                    </div>
                );
    }

    const renderPositionCard = (pos: Position) => {
        const { class: badgeClass } = getBadgeClass(pos);

        if (viewType === 'list') {
            return (
                <div
                    key={pos.id}
                    className={cn(
                        "group flex items-center gap-6 px-6 py-3 hover:bg-[#f3f2f1] transition-all cursor-pointer relative",
                        pos.status === 'CLOSED' && "opacity-60"
                    )}
                    onClick={() => setViewPos(pos)}
                >
                    <div className="flex items-center gap-4 min-w-[280px]">
                        <div className={cn("w-1 h-8 rounded-sm shrink-0", pos.status === 'OPEN' ? "bg-[#0c2461]" : "bg-[#605e5c]")} />
                        <div className="flex flex-col text-left">
                            <h3 className="text-sm font-semibold text-[#323130] truncate text-left">{pos.title}</h3>
                            <span className="text-[11px] text-[#605e5c] text-left">Job Posting</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-10 flex-1 text-left">
                        <div className="flex items-center gap-2 text-xs text-[#323130] text-left">
                            <MapPin size={14} className="text-[#605e5c]" /> {pos.location}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#323130] text-left">
                            <Monitor size={14} className="text-[#605e5c]" /> {pos.work_arrangement}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-left">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(pos); }} className="p-1.5 text-[#605e5c] hover:text-[#0c2461] rounded-sm"><Edit2 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmTarget(pos); }} className="p-1.5 text-[#605e5c] hover:text-[#0c2461] rounded-sm"><Activity size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setPendingDelete(pos); }} className="p-1.5 text-[#605e5c] hover:text-[#a4262c] rounded-sm"><Trash2 size={14} /></button>
                    </div>
                </div>
            );
        }

        return (
                <div
                    key={pos.id}
                    className={cn(
                        "group bg-white border border-[#edebe9] hover:border-[#0c2461] transition-all p-5 relative flex flex-col cursor-pointer min-h-[180px] text-left w-[280px] shrink-0",
                        pos.status === 'CLOSED' && "opacity-60"
                    )}
                    onClick={() => setViewPos(pos)}
                >
                <div className="flex items-start justify-between mb-4 text-left">
                    <div className="flex flex-col gap-1.5 text-left">
                        <span className={cn("px-2 py-0.5 rounded-sm text-[10px] font-semibold w-fit border", badgeClass)}>
                            {pos.status === 'OPEN' ? 'OPEN' : 'CLOSED'} • {getTimeStatus(pos)}
                        </span>
                        <h3 className="text-[15px] font-semibold text-[#323130] mt-1 line-clamp-1 text-left">{pos.title}</h3>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#0c2461] text-left">
                            <Building2 size={12} /> External Role
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-left">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(pos); }} className="p-1.5 text-[#605e5c] hover:text-[#0c2461] transition-colors"><Edit2 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setPendingDelete(pos); }} className="p-1.5 text-[#605e5c] hover:text-[#a4262c] transition-colors"><Trash2 size={14} /></button>
                    </div>
                </div>
                
                <label 
                    className="w-full h-32 mb-4 overflow-hidden rounded-sm border border-[#edebe9] bg-[#f3f2f1] flex items-center justify-center cursor-pointer group/img relative text-left"
                    onClick={(e) => e.stopPropagation()}
                >
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(pos.id, file);
                        }}
                    />
                    {pos.image_url ? (
                        <>
                            <img src={pos.image_url} alt={pos.title} className="w-full h-full object-cover group-hover/img:opacity-75 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <span className="bg-black/50 text-white px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-2">
                                    <ImageIcon size={14} /> Change Cover
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-1.5 text-[#605e5c] opacity-60 group-hover/img:opacity-100 transition-opacity">
                            <ImageIcon size={20} />
                            <span className="text-xs font-medium">Add Cover Image</span>
                        </div>
                    )}
                </label>

                <p className="text-xs text-[#605e5c] line-clamp-2 mb-6 text-left">
                    {pos.description}
                </p>

                <div className="flex flex-col gap-2 mb-6 text-xs text-[#323130] mt-auto text-left">
                    <div className="flex items-center gap-2 text-left">
                        <MapPin size={12} className="text-[#605e5c]" /> {pos.location}
                    </div>
                    <div className="flex items-center gap-2 text-left">
                        <Monitor size={12} className="text-[#605e5c]" /> {pos.work_arrangement}
                    </div>
                </div>

                <div className="flex gap-2 border-t border-[#f3f2f1] pt-4 text-left">
                    <button 
                        onClick={e => { e.stopPropagation(); setConfirmTarget(pos); }}
                        className={cn(
                            "flex-1 py-1.5 text-xs font-semibold transition-all border rounded-sm px-4 flex items-center justify-between group/btn text-left",
                            pos.status === 'OPEN' 
                                ? "bg-[#0c2461] border-[#0c2461] text-white hover:bg-[#081b4d]" 
                                : "bg-white border-[#edebe9] text-[#605e5c] hover:bg-[#f3f2f1]"
                        )}
                    >
                        {pos.status === 'OPEN' ? 'Close Posting' : 'Re-open Posting'}
                        <ChevronRight size={14} />
                    </button>
                    <button 
                        onClick={e => { e.stopPropagation(); setViewPos(pos); }}
                        className="px-2.5 py-1.5 border border-[#edebe9] rounded-sm text-[#605e5c] hover:bg-[#f3f2f1] transition-all text-left"
                        title="View Details"
                    >
                        <ExternalLink size={14} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-[1920px] mx-auto px-4 md:px-6">
            <PositionHeader 
                hideHeader={hideHeader}
                onAdd={handleOpenCreateModal}
                onAddCategory={handleOpenCategoryModal}
            />

            <PositionFilterBar 
                search={search}
                onSearchChange={setSearch}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                viewType={viewType}
                onViewTypeChange={setViewType}
                categories={categories}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
            />

            <div className="pb-12 space-y-12">
                {publicPositions.length === 0 && categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white border border-[#edebe9] rounded-sm text-center">
                        <h3 className="text-sm font-semibold text-[#323130] mb-1">No postings found</h3>
                        <p className="text-xs text-[#605e5c]">Try adjusting your search filters.</p>
                    </div>
                ) : (
                    orderedSections.map(section => {
                        // Skip empty named categories only if searching
                        if (section.positions.length === 0 && search && section.category) return null;

                        return (
                            <div key={section.key} className="space-y-4">
                                {/* Category Section Header */}
                                <div className="flex items-center gap-3 border-b border-[#edebe9] pb-2 text-left group/section">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen size={15} className="text-[#605e5c]" />
                                        <h2 className="text-md font-bold text-[#323130] uppercase tracking-wider">{section.name}</h2>
                                    </div>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f2f1] text-[#605e5c]">{section.positions.length}</span>
                                    
                                    {/* Category action buttons (only for named categories) */}
                                    {section.category && (
                                        <div className="flex items-center gap-1 ml-auto opacity-0 group-hover/section:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setAssignModal(section.category!)}
                                                className="flex items-center gap-1 px-2.5 h-6 text-[10px] font-semibold text-[#0c2461] border border-[#edebe9] rounded-sm hover:bg-[#f3f2f1] transition-all"
                                                title="Add postings to this category"
                                            >
                                                <Plus size={11} /> Add Postings
                                            </button>
                                            <button
                                                onClick={() => handleEditCategory(section.category!)}
                                                className="p-1 text-[#605e5c] hover:text-[#0c2461] transition-colors rounded-sm"
                                                title="Edit category"
                                            >
                                                <Edit2 size={13} />
                                            </button>
                                            <button
                                                onClick={() => setPendingDeleteCategory(section.category!)}
                                                className="p-1 text-[#605e5c] hover:text-[#a4262c] transition-colors rounded-sm"
                                                title="Delete category"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {section.positions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 bg-[#faf9f8] border border-dashed border-[#edebe9] rounded-sm text-center">
                                        <FolderOpen size={24} className="text-[#a19f9d] mb-2" />
                                        <p className="text-xs text-[#605e5c]">No postings in this category yet.</p>
                                        {section.category && (
                                            <button
                                                onClick={() => setAssignModal(section.category!)}
                                                className="mt-3 flex items-center gap-1.5 px-3 h-7 text-[11px] font-semibold text-[#0c2461] border border-[#0c2461]/20 rounded-sm hover:bg-[#0c2461]/[0.04] transition-all"
                                            >
                                                <Plus size={12} /> Add Postings
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className={cn(
                                        viewType === 'grid'
                                            ? "flex flex-wrap justify-start gap-4"
                                            : "flex flex-col border border-[#edebe9] bg-white divide-y divide-[#edebe9]"
                                    )}>
                                        {section.positions.map(pos => renderPositionCard(pos))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ==================== */}
            {/* Job Posting Modal    */}
            {/* ==================== */}
            <Modal open={modal === 'create' || modal === 'edit'} onClose={() => { setModal(null); setSelectedImageFile(null); }} title={modal === 'edit' ? 'Update Posting' : 'New Job Posting'} size="lg">
                <div className="grid sm:grid-cols-2 gap-6 p-4 text-left">
                    <div className="sm:col-span-2 mb-2">
                        <label className="block text-xs font-semibold text-[#323130] mb-2 text-left">Cover Image</label>
                        <label className="w-full h-32 overflow-hidden rounded-sm border border-[#edebe9] bg-[#f3f2f1] flex items-center justify-center cursor-pointer group/img relative text-left">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setSelectedImageFile(file);
                                }}
                            />
                            {selectedImageFile || editingPosition?.image_url ? (
                                <>
                                    <img 
                                        src={selectedImageFile ? URL.createObjectURL(selectedImageFile) : editingPosition?.image_url} 
                                        alt="Cover Preview" 
                                        className="w-full h-full object-cover group-hover/img:opacity-75 transition-opacity" 
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                        <span className="bg-black/50 text-white px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-2">
                                            <ImageIcon size={14} /> Change Cover
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-1.5 text-[#605e5c] opacity-60 group-hover/img:opacity-100 transition-opacity">
                                    <ImageIcon size={20} />
                                    <span className="text-xs font-medium">Click to upload cover image</span>
                                </div>
                            )}
                        </label>
                    </div>
                    <div className="text-left">
                        <label className="block text-xs font-semibold text-[#323130] mb-2 text-left">Job Title</label>
                        <input value={String(form.title)} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Bilingual Support" className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-sm text-sm text-[#323130] focus:border-[#0078d4] outline-none text-left" />
                    </div>
                    <div className="text-left">
                        <label className="block text-xs font-semibold text-[#323130] mb-2 text-left">Work Location</label>
                        <input value={String(form.location)} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                            placeholder="e.g. Cebu City" className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-sm text-sm text-[#323130] focus:border-[#0078d4] outline-none text-left" />
                    </div>
                    {/* Category Selector */}
                    <div className="text-left">
                        <label className="block text-xs font-semibold text-[#323130] mb-2 text-left">Category</label>
                        <select
                            value={form.category_id || ''}
                            onChange={e => setForm(f => ({ ...f, category_id: e.target.value || null }))}
                            className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-sm text-sm text-[#323130] focus:border-[#0078d4] outline-none text-left appearance-none"
                        >
                            <option value="">Uncategorized</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:col-span-2 text-left">
                        <label className="block text-xs font-semibold text-[#323130] mb-2 text-left">Primary Description</label>
                        <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Describe the role requirements for applicants..." className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-sm text-sm text-[#323130] focus:border-[#0078d4] outline-none text-left" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 p-6 mt-6 border-t border-[#edebe9] text-left">
                    <button onClick={() => setModal(null)} className="px-4 py-1.5 text-sm font-medium text-[#323130] hover:bg-[#f3f2f1] rounded-sm transition-all text-left">Cancel</button>
                    <button onClick={async () => {
                        if (modal === 'edit') {
                            await handleUpdate();
                        } else {
                            setForm(f => ({ ...f, department: '', hiring_quota: 0 }));
                            await handleCreate();
                        }
                        setModal(null);
                    }} className="px-6 py-1.5 bg-[#0078d4] hover:bg-[#005a9e] text-white text-sm font-semibold rounded-sm transition-all text-left">
                        {modal === 'edit' ? 'Save Changes' : 'Publish Posting'}
                    </button>
                </div>
            </Modal>

            {/* ========================== */}
            {/* Category Create/Edit Modal */}
            {/* ========================== */}
            <Modal
                open={categoryModal === 'create' || categoryModal === 'edit'}
                onClose={() => { setCategoryModal(null); setCategoryForm({ name: '', description: '' }); }}
                title={categoryModal === 'edit' ? 'Edit Category' : 'New Category'}
                size="sm"
            >
                <div className="p-5 space-y-4 text-left">
                    <div>
                        <label className="block text-xs font-semibold text-[#323130] mb-2">Category Name</label>
                        <input
                            value={categoryForm.name}
                            onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Customer Service, Technical Support"
                            className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-sm text-sm text-[#323130] focus:border-[#0078d4] outline-none"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#323130] mb-2">Description <span className="text-[#a19f9d] font-normal">(optional)</span></label>
                        <textarea
                            rows={3}
                            value={categoryForm.description}
                            onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Brief description of this category..."
                            className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-sm text-sm text-[#323130] focus:border-[#0078d4] outline-none"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#edebe9]">
                    <button
                        onClick={() => { setCategoryModal(null); setCategoryForm({ name: '', description: '' }); }}
                        className="px-4 py-1.5 text-sm font-medium text-[#323130] hover:bg-[#f3f2f1] rounded-sm transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={categoryModal === 'edit' ? handleUpdateCategory : handleCreateCategory}
                        disabled={!categoryForm.name.trim()}
                        className={cn(
                            "px-5 py-1.5 text-sm font-semibold rounded-sm transition-all",
                            categoryForm.name.trim()
                                ? "bg-[#0c2461] hover:bg-[#081b4d] text-white"
                                : "bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed"
                        )}
                    >
                        {categoryModal === 'edit' ? 'Save' : 'Create Category'}
                    </button>
                </div>
            </Modal>

            {/* ============================== */}
            {/* Assign Postings to Category    */}
            {/* ============================== */}
            <Modal
                open={!!assignModal}
                onClose={() => { setAssignModal(null); setAssignSelected(new Set()); }}
                title={assignModal ? `Add Postings to "${assignModal.name}"` : ''}
                size="lg"
            >
                {assignModal && (
                    <>
                        <div className="p-4 max-h-[400px] overflow-y-auto">
                            {availableForAssign.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <CheckCircle2 size={28} className="text-[#107c10] mb-2" />
                                    <p className="text-sm text-[#323130] font-medium">All postings are already in this category.</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {availableForAssign.map(pos => {
                                        const isSelected = assignSelected.has(pos.id);
                                        const currentCatName = pos.category_id 
                                            ? categories.find(c => c.id === pos.category_id)?.name || 'Unknown'
                                            : 'Uncategorized';
                                        return (
                                            <button
                                                key={pos.id}
                                                onClick={() => {
                                                    setAssignSelected(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(pos.id)) next.delete(pos.id);
                                                        else next.add(pos.id);
                                                        return next;
                                                    });
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-sm text-left transition-all border",
                                                    isSelected
                                                        ? "bg-[#0c2461]/[0.04] border-[#0c2461]/20"
                                                        : "bg-white border-transparent hover:bg-[#faf9f8]"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 transition-all",
                                                    isSelected
                                                        ? "bg-[#0c2461] border-[#0c2461]"
                                                        : "border-[#c8c6c4] bg-white"
                                                )}>
                                                    {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#323130] truncate">{pos.title}</p>
                                                    <p className="text-[11px] text-[#605e5c]">
                                                        Currently in: {currentCatName}
                                                    </p>
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] font-semibold px-2 py-0.5 rounded-sm border",
                                                    pos.status === 'OPEN'
                                                        ? "text-[#107c10] border-[#107c10]/20 bg-[#107c10]/5"
                                                        : "text-[#605e5c] border-[#edebe9] bg-[#f3f2f1]"
                                                )}>
                                                    {pos.status}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between px-5 py-4 border-t border-[#edebe9]">
                            <span className="text-xs text-[#605e5c]">
                                {assignSelected.size} posting{assignSelected.size !== 1 ? 's' : ''} selected
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setAssignModal(null); setAssignSelected(new Set()); }}
                                    className="px-4 py-1.5 text-sm font-medium text-[#323130] hover:bg-[#f3f2f1] rounded-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        handleAssignPositions(assignModal.id, Array.from(assignSelected));
                                        setAssignSelected(new Set());
                                    }}
                                    disabled={assignSelected.size === 0}
                                    className={cn(
                                        "px-5 py-1.5 text-sm font-semibold rounded-sm transition-all",
                                        assignSelected.size > 0
                                            ? "bg-[#0c2461] hover:bg-[#081b4d] text-white"
                                            : "bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed"
                                    )}
                                >
                                    Move to Category
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </Modal>

            {/* View Details Modal */}
            <Modal open={!!viewPos} onClose={() => setViewPos(null)} title="Job Posting Details" size="xl">
                {viewPos && (
                    <div className="space-y-8 p-6 text-left">
                        <div className="flex items-center gap-6 border-b border-[#f3f2f1] pb-8 text-left">
                            <div className="w-16 h-16 bg-[#f3f2f1] flex items-center justify-center text-[#323130] rounded-sm text-left">
                                <Briefcase size={32} />
                            </div>
                            <div className="text-left">
                                <h2 className="text-2xl font-semibold text-[#323130] tracking-tight text-left">{viewPos.title}</h2>
                                <p className="text-sm font-medium text-[#0078d4] mt-0.5 text-left">Active Job Posting</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-10 text-left">
                            <div className="md:col-span-2 space-y-6 text-left">
                                <div className="text-left">
                                    <h4 className="text-xs font-semibold text-[#323130] mb-4 uppercase tracking-wider text-left">Role Overview</h4>
                                    <p className="text-sm text-[#605e5c] leading-relaxed whitespace-pre-wrap font-medium p-6 bg-white border border-[#edebe9] rounded-sm text-left">
                                        {viewPos.description}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-6 text-left">
                                <div className="bg-[#f3f2f1] p-6 rounded-sm border border-[#edebe9] text-left">
                                    <h4 className="text-xs font-semibold text-[#323130] mb-4 uppercase tracking-wider text-left">Logistics</h4>
                                    <div className="space-y-4 text-left">
                                        <div className="flex justify-between items-center border-b border-[#edebe9] pb-2 text-left">
                                            <span className="text-xs font-medium text-[#605e5c] text-left">Location</span>
                                            <span className="text-xs font-semibold text-[#323130] text-left">{viewPos.location}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-[#edebe9] pb-2 text-left">
                                            <span className="text-xs font-medium text-[#605e5c] text-left">Arrangement</span>
                                            <span className="text-xs font-semibold text-[#323130] text-left">{viewPos.work_arrangement}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-left">
                                            <span className="text-xs font-medium text-[#605e5c] text-left">Category</span>
                                            <span className="text-xs font-semibold text-[#323130] text-left">
                                                {viewPos.category_id
                                                    ? categories.find(c => c.id === viewPos.category_id)?.name || 'Unknown'
                                                    : 'Uncategorized'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmDialog 
                open={!!confirmTarget} 
                onClose={() => setConfirmTarget(null)} 
                onConfirm={async () => {
                    await toggleClose(confirmTarget!);
                    setConfirmTarget(null);
                }}
                title="Update Status" 
                message="Change visibility for this job posting?" 
            />

            <ConfirmDialog 
                open={!!pendingDelete} 
                onClose={() => setPendingDelete(null)} 
                onConfirm={async () => {
                    await handleDelete(pendingDelete!);
                    setPendingDelete(null);
                }}
                title="Remove Posting" 
                message={`Permanently delete this role?`} 
                confirmClass="bg-[#a4262c] text-white"
            />

            {/* Delete Category Confirm */}
            <ConfirmDialog
                open={!!pendingDeleteCategory}
                onClose={() => setPendingDeleteCategory(null)}
                onConfirm={async () => {
                    if (pendingDeleteCategory) {
                        await handleDeleteCategory(pendingDeleteCategory);
                    }
                }}
                title="Delete Category"
                message={pendingDeleteCategory ? `Delete "${pendingDeleteCategory.name}"? All postings in this category will revert to Uncategorized.` : ''}
                confirmClass="bg-[#a4262c] text-white"
            />
        </div>
    );
}
