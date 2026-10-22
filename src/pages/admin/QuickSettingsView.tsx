import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase, Building2, Layers, MapPin, Target, Users, Calendar, DoorOpen, Monitor, Shield, BookOpen, AlertCircle, Settings, ChevronRight, Edit2, ArrowRight, Edit3
} from 'lucide-react';
import { AddRoomModal, EditRoomModal } from '@/pages/recruiter/components/InterviewRoomsUI';
import { AccountFormModal } from './components/AccountFormModal';
import { AddCandidateSelectorModal } from '@/pages/recruiter/applicant-management/components/AddCandidateSelectorModal';
import { Modal } from '@/components/common/Modal';
import { useRoomStore } from '@/store/roomStore';
import { AddApplicantRegistryModal } from '@/components/features/Registry/AddApplicantRegistryModal';
import { QueueLobbySettingsModal } from './components/QueueLobbySettingsModal';
import { DepartmentService, type Department } from '@/services/DepartmentService';

// Mock Setting Interface
interface SettingCard {
    id: string;
    label: string;
    icon: React.ElementType;
    description?: string;
    advancedUrl?: string;
    onClick?: () => void;
    onQuickEdit?: () => void;
    onAdvancedSettings?: () => void;
}

interface SettingCategory {
    title: string;
    items: SettingCard[];
}

export function QuickSettingsView() {
    const navigate = useNavigate();
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [modalView, setModalView] = useState<'prompt' | 'quick_edit' | 'edit_department_type_selector'>('prompt');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // States for Add Room Mock
    const [newRoom, setNewRoom] = useState<{ room_number: string; room_name: string; image_url: string; room_type?: string }>({ room_number: '', room_name: '', image_url: '', room_type: 'onsite' });
    // States for Edit Room Mock
    const [editRoom, setEditRoom] = useState<any>({ id: '1', room_number: 'RM-101', room_name: 'General Room', image_url: '', room_type: 'onsite' });
    // State for Account Form Mock
    // State for Account Form Mock
    const [accountForm, setAccountForm] = useState({ name: '', head: '', budget_code: '', type: 'ACCOUNTS' });
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const { rooms, loadRooms } = useRoomStore();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [editDepartmentType, setEditDepartmentType] = useState<'ACCOUNTS' | 'SUPPORT_ROLES'>('ACCOUNTS');
    const [isFetchingDepts, setIsFetchingDepts] = useState(false);

    useEffect(() => {
        loadRooms(true);
    }, [loadRooms]);

    const handleAddRoom = async () => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setActiveModal(null);
        }, 1000);
    };

    const handleEditRoom = async () => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setActiveModal(null);
        }, 1000);
    };

    const handleAddAccount = async () => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setActiveModal(null);
            setAccountForm({ name: '', head: '', budget_code: '', type: 'ACCOUNTS' });
        }, 1000);
    };

    const categories: SettingCategory[] = [
        {
            title: 'Interview Management',
            items: [
                { 
                    id: 'add_room', 
                    label: 'Add Interview Room', 
                    icon: DoorOpen, 
                    onQuickEdit: () => {
                        setActiveModal('add_room_modal');
                    },
                    onAdvancedSettings: () => {
                        setActiveModal(null);
                        const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
                        navigate(`${basePath}/rooms`); 
                    }
                },
                { 
                    id: 'edit_room', 
                    label: 'Edit Interview Room', 
                    icon: Monitor, 
                    onQuickEdit: () => {
                        setActiveModal('edit_room_selector');
                    },
                    onAdvancedSettings: () => {
                        setActiveModal(null);
                        const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
                        navigate(`${basePath}/rooms`); 
                    }
                },
                {
                    id: 'queue_settings',
                    label: 'Queue Settings',
                    icon: Settings,
                    onQuickEdit: () => {
                        setActiveModal('queue_settings');
                    },
                    onAdvancedSettings: () => {
                        setActiveModal(null);
                        const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
                        navigate(`${basePath}/settings/queue-settings`); 
                    }
                }
            ]
        },
        {
            title: 'Field Settings',
            items: [
                { id: 'department', label: 'Department (Account)', icon: Building2, onClick: () => setActiveModal('department') },
                {
                    id: 'edit_department',
                    label: 'Edit Department (Account)',
                    icon: Edit3,
                    onQuickEdit: () => {
                        setActiveModal('edit_department');
                        setModalView('edit_department_type_selector');
                    },
                    onAdvancedSettings: () => {
                        setActiveModal(null);
                        const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
                        navigate(`${basePath}/account-management`); 
                    }
                }
            ]
        },
        {
            title: 'Applicant Management',
            items: [
                { 
                    id: 'add_candidate', 
                    label: 'Interview Form Candidate', 
                    icon: Users,
                    onQuickEdit: () => {
                        setActiveModal('add_candidate_selector');
                        setModalView('prompt');
                    },
                    onAdvancedSettings: () => {
                        setActiveModal(null);
                        const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
                        navigate(`${basePath}/applicants`, { state: { openAddCandidate: true } });
                    }
                },
                {
                    id: 'masterlist_candidate',
                    label: 'Masterlist Candidate',
                    icon: Users,
                    onClick: () => setActiveModal('masterlist_candidate')
                }
            ]
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    const activeItem = categories.flatMap(c => c.items).find(i => i.id === activeModal);

    return (
        <div className="flex-1 min-h-[calc(100vh-100px)] bg-[#f8fafc] overflow-hidden p-8 font-sans relative">
            {/* Dynamic Grid Background for technical feel */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=')] opacity-60 pointer-events-none" />
            
            {/* Animated Glowing Orbs (Light Mode friendly) */}
            <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/40 rounded-full blur-[100px] pointer-events-none" 
            />
            <motion.div 
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[90px] pointer-events-none" 
            />
            <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute top-[40%] left-[60%] w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-[80px] pointer-events-none" 
            />

            <div className="max-w-[1400px] mx-auto space-y-14 pb-16 relative z-10">
                
                {/* Redesigned Header */}
                <motion.div 
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center text-center pb-8 relative"
                >
                    <div className="inline-flex items-center justify-center p-3 mb-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 shadow-[0_8px_30px_-6px_rgba(99,102,241,0.15)] relative group">
                        <div className="absolute inset-0 bg-indigo-50/50 rounded-2xl group-hover:bg-indigo-100/50 transition-colors duration-500" />
                        <Settings size={34} className="text-[#002060] relative z-10 animate-[spin_8s_linear_infinite]" />
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-200 tracking-tight drop-shadow-sm mb-3">
                        Quick <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#002060] to-indigo-600">Settings</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-300" />
                        <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">
                            System Configuration & References
                        </p>
                        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-300" />
                    </div>
                </motion.div>

                {categories.map((category, idx) => (
                    <motion.div 
                        key={idx}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800/70 pb-3">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-4 h-4 bg-indigo-200 rounded-full animate-ping opacity-60" />
                                <div className="w-2 h-2 rounded-full bg-indigo-600 relative z-10" />
                            </div>
                            <h2 className="text-[13px] font-bold text-slate-600 uppercase tracking-[0.15em]">
                                {category.title}
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {category.items.map((item) => (
                                <motion.button
                                    key={item.id}
                                    variants={itemVariants}
                                    whileHover={{ y: -6, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={item.onClick ? item.onClick : () => { setActiveModal(item.id); setModalView('prompt'); }}
                                    className="group relative flex flex-col items-start p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-[24px] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(99,102,241,0.2)] hover:border-indigo-300 transition-all duration-300 text-left min-h-[160px] overflow-hidden"
                                >
                                    {/* Top decorative gradient line */}
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#002060] via-indigo-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    {/* Ambient hover glow inside card */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    
                                    {/* Corner decorative shape */}
                                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br from-indigo-100 to-blue-100/50 rounded-full blur-2xl group-hover:scale-150 group-hover:from-indigo-200/60 group-hover:to-blue-200/60 transition-all duration-700" />

                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 flex items-center justify-center group-hover:bg-white dark:bg-slate-900 group-hover:border-indigo-100 group-hover:shadow-[0_8px_16px_-6px_rgba(99,102,241,0.2)] transition-all duration-300 mb-5 relative z-10">
                                        <item.icon size={26} className="text-slate-400 group-hover:text-[#002060] transition-colors stroke-[1.5] group-hover:scale-110 duration-300" />
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 w-full relative z-10 mt-auto">
                                        <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#002060] transition-colors leading-tight">
                                            {item.label}
                                        </span>
                                        <span className="text-[12px] font-medium text-slate-400 group-hover:text-indigo-600 transition-colors line-clamp-1 flex items-center justify-between w-full">
                                            Manage settings
                                            <div className="transform -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                                <ArrowRight size={14} className="text-indigo-500" />
                                            </div>
                                        </span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modals */}
            <AddRoomModal 
                open={activeModal === 'add_room_modal'}
                onClose={() => setActiveModal(null)}
                onAdd={handleAddRoom}
                newRoom={newRoom}
                setNewRoom={setNewRoom}
                isSubmitting={isSubmitting}
            />

            <EditRoomModal
                open={activeModal === 'edit_room_modal'}
                onClose={() => setActiveModal(null)}
                onSave={handleEditRoom}
                editRoom={editRoom}
                setEditRoom={setEditRoom}
                isSubmitting={isSubmitting}
            />

            <AccountFormModal
                modal={activeModal === 'department'}
                setModal={(open) => setActiveModal(open ? 'department' : null)}
                editingId={editingId}
                setEditingId={setEditingId}
                form={accountForm}
                setForm={setAccountForm}
                handleAddAccount={handleAddAccount}
                submitting={isSubmitting}
            />

            <AddCandidateSelectorModal 
                open={activeModal === 'add_candidate_selector'}
                onClose={() => setActiveModal(null)}
                onSelect={(type) => setActiveModal(null)}
            />
            
            <AddApplicantRegistryModal 
                open={activeModal === 'masterlist_candidate'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
            />
            
            <QueueLobbySettingsModal 
                open={activeModal === 'queue_settings'}
                onClose={() => setActiveModal(null)}
            />

            
            {/* Department Selector Modal */}
            {activeModal === 'edit_department_selector' && (
                <Modal open={true} onClose={() => setActiveModal(null)} title={`Select ${editDepartmentType === 'ACCOUNTS' ? 'Client Account' : 'Support Role'} to Edit`} size="md">
                    <div className="p-5 max-h-[65vh] overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-800/30">
                        {isFetchingDepts ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                                <h4 className="text-slate-700 dark:text-slate-300 font-bold text-sm">Loading Departments...</h4>
                            </div>
                        ) : (
                            <AnimatePresence>
                                <div className="grid grid-cols-2 gap-4">
                                    {departments.map((dept, index) => (
                                        <motion.button
                                            key={dept.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.2, delay: index * 0.02 }}
                                            onClick={() => {
                                                setAccountForm({ name: dept.name, head: dept.head || '', budget_code: dept.budget_code || '', type: dept.type || 'ACCOUNTS' });
                                                setEditingId(dept.id);
                                                setActiveModal('department'); // Opens AccountFormModal
                                            }}
                                            className="w-full aspect-square flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 hover:bg-gradient-to-b hover:from-white hover:to-indigo-50/30 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-200 rounded-2xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_24px_-8px_rgba(0,32,96,0.12)] transition-all duration-300 group relative overflow-hidden text-center"
                                        >
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#002060] to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            <div className="w-12 h-12 mb-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center group-hover:border-indigo-200 group-hover:shadow-inner transition-all duration-300 shrink-0">
                                                <Building2 size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-[13px] group-hover:text-[#002060] transition-colors leading-tight line-clamp-2">
                                                {dept.name}
                                            </div>
                                            {dept.budget_code && (
                                                <div className="text-[10px] font-medium text-slate-400 truncate w-full mt-1">
                                                    {dept.budget_code}
                                                </div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </AnimatePresence>
                        )}
                        {!isFetchingDepts && departments.length === 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 flex items-center justify-center mb-4">
                                    <Building2 size={24} className="text-slate-300" />
                                </div>
                                <h4 className="text-slate-700 dark:text-slate-300 font-bold text-sm">No Departments Available</h4>
                            </motion.div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Room Selector Modal */}
            {activeModal === 'edit_room_selector' && (
                <Modal open={true} onClose={() => setActiveModal(null)} title="Select Room to Edit" size="md">
                    <div className="p-5 max-h-[65vh] overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-800/30">
                        <AnimatePresence>
                            <div className="grid grid-cols-2 gap-4">
                                {rooms.map((room, index) => (
                                    <motion.button
                                        key={room.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        onClick={() => {
                                            setEditRoom({ id: room.id, room_number: room.room_number, room_name: room.room_name || '', image_url: room.image_url || '', room_type: room.room_type || 'onsite' });
                                            setActiveModal('edit_room_modal');
                                        }}
                                        className="w-full aspect-square flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 hover:bg-gradient-to-b hover:from-white hover:to-indigo-50/30 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-200 rounded-2xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_24px_-8px_rgba(0,32,96,0.12)] transition-all duration-300 group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#002060] to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {room.image_url ? (
                                            <div className="w-16 h-16 mb-3 rounded-full overflow-hidden shadow-sm border border-slate-100 relative group-hover:shadow-md transition-shadow shrink-0">
                                                <img src={room.image_url} alt={room.room_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 mb-3 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center group-hover:border-indigo-200 group-hover:shadow-inner transition-all duration-300 shrink-0">
                                                <Monitor size={24} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                        )}
                                        
                                        <div className="flex flex-col items-center gap-1 w-full text-center">
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-[14px] flex flex-col items-center gap-1 group-hover:text-[#002060] transition-colors leading-tight">
                                                Room {room.room_number}
                                                {room.room_type === 'online' ? (
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider shadow-sm">Online</span>
                                                ) : (
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider shadow-sm">Onsite</span>
                                                )}
                                            </div>
                                            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate w-full group-hover:text-slate-600 transition-colors px-2">{room.room_name || 'Unassigned Name'}</div>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </AnimatePresence>
                        
                        {rooms.length === 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 flex items-center justify-center mb-4">
                                    <Monitor size={24} className="text-slate-300" />
                                </div>
                                <h4 className="text-slate-700 dark:text-slate-300 font-bold text-sm">No Rooms Available</h4>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">There are currently no interview rooms to edit.</p>
                            </motion.div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Action Prompt Modal for other items */}
            {activeModal && activeItem && !['add_room_modal', 'edit_room_modal', 'edit_room_selector', 'edit_department_selector', 'department', 'masterlist_candidate', 'queue_settings', 'add_candidate_selector'].includes(activeModal) && (
                <Modal open={true} onClose={() => setActiveModal(null)} title={`${activeItem.label} Configuration`}>
                    {modalView === 'prompt' ? (
                        <div className="p-7 space-y-6 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-[0_4px_12px_-4px_rgba(79,70,229,0.2)] flex items-center justify-center shrink-0 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#002060]/5 to-transparent" />
                                    <activeItem.icon size={28} className="text-[#002060] stroke-[1.5] relative z-10" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Manage {activeItem.label}</h3>
                                    <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-2 max-w-[280px] mx-auto leading-relaxed">
                                        Would you like to quickly edit this setting here, or proceed to the dedicated configuration page?
                                    </p>
                                </div>
                            </div>
                            
                            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center w-full mt-2">
                                <button
                                    onClick={() => {
                                        if (activeItem.onQuickEdit) {
                                            activeItem.onQuickEdit();
                                        } else {
                                            setModalView('quick_edit');
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 hover:shadow-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white text-[13px] font-bold rounded-xl transition-all duration-200 active:scale-95 group"
                                >
                                    <Edit2 size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                                    Quick Edit
                                </button>
                                <button
                                    onClick={activeItem.onAdvancedSettings}
                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#002060] to-indigo-600 hover:to-indigo-500 text-white text-[13px] font-bold rounded-xl shadow-[0_4px_12px_-4px_rgba(79,70,229,0.4)] hover:shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all duration-200 active:scale-95 group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 dark:bg-slate-900/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                                    <span className="relative z-10">Redirect to Tab</span>
                                    <ArrowRight size={16} className="relative z-10 transform group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                                    <activeItem.icon size={24} className="text-indigo-600 stroke-[1.5]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#002060]">Quick Edit: {activeItem.label}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Add or modify entries directly.</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">New Entry Name</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-700 rounded-md p-2.5 text-sm focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none" placeholder={`Enter new ${activeItem.label.toLowerCase()}...`} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Status</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-700 rounded-md p-2.5 text-sm focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none bg-white dark:bg-slate-900">
                                        <option>Active</option>
                                        <option>Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                                <button
                                    onClick={() => setModalView('prompt')}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-md transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => {
                                        setIsSubmitting(true);
                                        setTimeout(() => { setIsSubmitting(false); setActiveModal(null); }, 800);
                                    }}
                                    className="px-6 py-2 bg-[#002060] hover:bg-indigo-900 text-white text-sm font-bold rounded-md transition-colors"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
}
