import React, { useRef } from 'react';
import { DoorOpen, Radio, Play, Power, Trash2, Timer, ClipboardCheck, RefreshCw, Edit2, Image, Upload, Eye, CheckCircle2, XCircle, AlertCircle, Calendar, Building, User, Star, Award, Sparkles } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';
import type { InterviewRoom, Application } from '@/types';
import { useAuthStore } from '@/store/authStore';

const PRESET_IMAGES = [
    { name: 'Glass Office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80' },
    { name: 'Modern Lounge', url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80' },
    { name: 'Boardroom', url: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=600&q=80' },
    { name: 'Cozy Workspace', url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80' }
];

interface RoomCardProps {
    room: InterviewRoom;
    application?: Application;
    onStart: () => void;
    onFree: () => void;
    onToggleActive: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function RoomCard({ room, application, onStart, onFree, onToggleActive, onEdit, onDelete }: RoomCardProps) {
    const { user } = useAuthStore();
    const isFinalInterview = application?.queue_type === 'FINAL';
    const isRecruiterOrAdmin = user?.role === 'recruiter' || user?.role === 'admin';
    const sessionReadOnly = isFinalInterview && isRecruiterOrAdmin;

    return (
        <div className={cn(
            "bg-white border border-surface-200 rounded-none transition-all hover:border-primary-300 group relative flex flex-col min-h-[300px] text-left overflow-hidden",
            !room.is_active && "opacity-65 grayscale bg-surface-50"
        )}>
            <div className={cn(
                "h-1.5 w-full shrink-0",
                !room.is_active ? "bg-surface-300" :
                    room.status === 'OCCUPIED' ? "bg-primary-600" :
                        room.status === 'AVAILABLE' ? "bg-emerald-500" : "bg-surface-300"
            )} />

            {/* Room Image */}
            <div className="h-28 w-full overflow-hidden relative bg-surface-50 border-b border-surface-100 shrink-0">
                {room.image_url ? (
                    <img 
                        src={room.image_url} 
                        alt={room.room_name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-surface-50 to-surface-100 flex items-center justify-center">
                        <DoorOpen size={28} className="text-surface-300" />
                    </div>
                )}
                <div className="absolute top-2 right-2">
                    <span className={cn(
                        "px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-wider border shadow-sm",
                        room.status === 'AVAILABLE' && room.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            room.status === 'OCCUPIED' ? "bg-primary-50 text-primary-700 border-primary-100" :
                                "bg-surface-50 text-surface-600 border-surface-200"
                    )}>
                        {!room.is_active ? 'Disabled' : room.status}
                    </span>
                </div>
            </div>

            {/* Room Details Header */}
            <div className="p-4 pb-2 flex items-start justify-between gap-3 text-left shrink-0">
                <div className="min-w-0 text-left">
                    <h3 className="text-sm font-black text-surface-900 group-hover:text-primary-700 transition-colors truncate text-left">
                        {room.room_name || `Room ${room.room_number}`}
                    </h3>
                    <p className="text-[9px] text-surface-400 font-black uppercase tracking-[0.14em] text-left">Room {room.room_number}</p>
                </div>
            </div>

            {/* Session Info / Body */}
            <div className="flex-1 px-4 text-left py-2">
                {room.status === 'OCCUPIED' && room.current_applicant_name ? (
                    <div className="p-3 bg-primary-50/60 border border-primary-100 rounded-none relative overflow-hidden text-left h-full flex flex-col justify-center gap-2">
                        <div className="flex items-center justify-between gap-1 border-b border-primary-100 pb-1.5 shrink-0">
                            <p className="text-[9px] text-primary-600 font-black uppercase tracking-wider flex items-center gap-1 text-left">
                                <Radio size={10} className="animate-pulse text-left" /> In Progress
                            </p>
                            <span className={cn(
                                "px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider border rounded-none shrink-0",
                                application?.queue_type === 'FINAL' 
                                    ? "bg-purple-50 text-purple-700 border-purple-200" 
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                            )}>
                                {application?.queue_type === 'FINAL' ? 'Final Interview' : 'Initial Interview'}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-bold text-surface-400 uppercase tracking-widest text-left leading-none mb-1">Candidate</p>
                            <p className="text-xs font-black text-surface-900 truncate text-left">{room.current_applicant_name}</p>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-bold text-surface-400 uppercase tracking-widest text-left leading-none mb-1">
                                {application?.queue_type === 'FINAL' ? 'Ops Validator' : 'Recruiter'}
                            </p>
                            <p className="text-[10px] font-bold text-surface-700 truncate text-left">
                                {application?.queue_type === 'FINAL' 
                                    ? (application?.assigned_ops_validator_name || 'Not assigned') 
                                    : (application?.assigned_recruiter_name || 'Not assigned')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[50px] flex flex-col justify-center border border-dashed border-surface-200 rounded-none p-3 bg-surface-50/60 text-left">
                        <p className="text-[9px] font-black text-surface-500 uppercase tracking-wider text-left">
                            {room.is_active ? 'Ready for Assignment' : 'Room Offline'}
                        </p>
                        <p className="text-[9px] font-medium text-surface-400 mt-0.5 text-left leading-tight">
                            {room.is_active ? 'No active interview session.' : 'Enable room to receive candidates.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 pt-2 flex flex-col gap-2 text-left shrink-0">
                {room.status === 'OCCUPIED' && (
                    <button onClick={onStart} className="w-full h-8 px-4 bg-surface-900 text-white text-[10px] font-black uppercase tracking-widest rounded-none hover:bg-black transition-all flex items-center justify-center gap-2 text-left border border-black shadow-sm">
                        {sessionReadOnly ? (
                            <>
                                <Eye size={11} /> View Progress
                            </>
                        ) : (
                            <>
                                <Play size={10} fill="currentColor" /> Enter Room
                            </>
                        )}
                    </button>
                )}
                <div className="flex gap-2 text-left">
                    {room.status === 'OCCUPIED' && !sessionReadOnly && (
                        <button onClick={onFree} className="flex-1 h-8 px-2 bg-white border border-emerald-600 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 rounded-none transition-all text-left">Clear</button>
                    )}
                    <button 
                        disabled={sessionReadOnly && room.status === 'OCCUPIED'} 
                        onClick={onToggleActive} 
                        className={cn(
                            "flex-1 h-8 px-2 bg-white border border-surface-300 text-[9px] font-black uppercase tracking-widest text-surface-600 hover:bg-surface-50 rounded-none transition-all flex items-center justify-center gap-1",
                            sessionReadOnly && room.status === 'OCCUPIED' && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Power size={11} />
                        {room.is_active ? 'OFF' : 'ON'}
                    </button>
                    <button 
                        disabled={sessionReadOnly && room.status === 'OCCUPIED'} 
                        onClick={onEdit} 
                        className={cn(
                            "w-8 h-8 flex items-center justify-center bg-white border border-surface-300 text-surface-600 hover:bg-surface-50 rounded-none transition-all text-left",
                            sessionReadOnly && room.status === 'OCCUPIED' && "opacity-50 cursor-not-allowed"
                        )} 
                        title="Edit room"
                    >
                        <Edit2 size={12} />
                    </button>
                    <button 
                        disabled={sessionReadOnly && room.status === 'OCCUPIED'} 
                        onClick={onDelete} 
                        className={cn(
                            "w-8 h-8 flex items-center justify-center bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-none transition-all text-left",
                            sessionReadOnly && room.status === 'OCCUPIED' && "opacity-50 cursor-not-allowed"
                        )} 
                        title="Delete room"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}

interface AddRoomModalProps {
    open: boolean;
    onClose: () => void;
    onAdd: () => void;
    newRoom: { room_number: string; room_name: string; image_url: string };
    setNewRoom: React.Dispatch<React.SetStateAction<{ room_number: string; room_name: string; image_url: string }>>;
    isSubmitting: boolean;
}

export function AddRoomModal({ open, onClose, onAdd, newRoom, setNewRoom, isSubmitting }: AddRoomModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setNewRoom(r => ({ ...r, image_url: reader.result as string }));
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <Modal open={open} onClose={onClose} title="Add New Interview Room" size="sm">
            <div className="relative overflow-hidden pt-2 p-1 text-left">
                <div className={cn("space-y-5 transition-all text-left", isSubmitting && "opacity-50 pointer-events-none")}>
                    <div className="bg-primary-50 p-3 border-l-4 border-primary-500 rounded-none mb-2 text-left">
                        <p className="text-[11px] font-medium text-primary-700 leading-relaxed text-left">Adding a new room allows recruiters to conduct interviews in this designated space.</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-surface-700 text-left">Room Number *</label>
                        <input value={newRoom.room_number} onChange={e => setNewRoom(r => ({ ...r, room_number: e.target.value }))} placeholder="e.g. 01" className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-none text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-left" />
                    </div>
                    <div className="space-y-1 text-left">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-surface-700 text-left">Room Name</label>
                        <input value={newRoom.room_name} onChange={e => setNewRoom(r => ({ ...r, room_name: e.target.value }))} placeholder="e.g. Interview Room A" className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-none text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-left" />
                    </div>

                    {/* Room Picture Selection / Upload */}
                    <div className="space-y-1.5 text-left">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-surface-700 text-left">Room Picture</label>
                        <div className="flex gap-3 items-center">
                            <div className="w-14 h-14 bg-surface-50 border border-surface-200 flex items-center justify-center overflow-hidden shrink-0">
                                {newRoom.image_url ? (
                                    <img src={newRoom.image_url} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <DoorOpen size={20} className="text-surface-300" />
                                )}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-2.5 py-1 bg-white border border-surface-350 text-[9px] font-black uppercase tracking-widest text-surface-700 hover:bg-surface-50 rounded-none transition-all flex items-center gap-1"
                                    >
                                        <Upload size={10} /> Upload
                                    </button>
                                    {newRoom.image_url && (
                                        <button 
                                            type="button" 
                                            onClick={() => setNewRoom(r => ({ ...r, image_url: '' }))}
                                            className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-[9px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 rounded-none transition-all"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <p className="text-[8px] text-surface-400 font-medium">JPEG, PNG, or base64 data.</p>
                            </div>
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-1 text-left">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-surface-700 text-left">Presets</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {PRESET_IMAGES.map((img) => (
                                <button
                                    key={img.name}
                                    type="button"
                                    onClick={() => setNewRoom(r => ({ ...r, image_url: img.url }))}
                                    className={cn(
                                        "h-10 border relative overflow-hidden group/preset rounded-none transition-all",
                                        newRoom.image_url === img.url ? "border-primary-600 ring-1 ring-primary-600" : "border-surface-200 hover:border-surface-300"
                                    )}
                                    title={img.name}
                                >
                                    <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover/preset:scale-110 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover/preset:opacity-100 transition-opacity">
                                        <span className="text-[7px] font-black text-white uppercase tracking-wider text-center px-0.5 truncate w-full">{img.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-3 text-left">
                        <button onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-surface-300 text-[10px] font-black uppercase tracking-widest text-surface-700 rounded-none hover:bg-surface-50 transition-all text-left text-center">Cancel</button>
                        <button onClick={onAdd} className="flex-1 px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-none hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-left border border-emerald-700 shadow-sm">
                            {isSubmitting ? <><RefreshCw size={12} className="animate-spin text-left" /> Adding...</> : 'Add Room'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

interface EditRoomModalProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    editRoom: { room_number: string; room_name: string; image_url: string };
    setEditRoom: React.Dispatch<React.SetStateAction<{ room_number: string; room_name: string; image_url: string }>>;
    isSubmitting: boolean;
}

export function EditRoomModal({ open, onClose, onSave, editRoom, setEditRoom, isSubmitting }: EditRoomModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setEditRoom(r => ({ ...r, image_url: reader.result as string }));
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <Modal open={open} onClose={onClose} title="Edit Interview Room" size="sm">
            <div className="relative overflow-hidden pt-2 p-1 text-left">
                <div className={cn("space-y-5 transition-all text-left", isSubmitting && "opacity-50 pointer-events-none")}>
                    <div className="space-y-1 text-left">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-surface-700 text-left">Room Number *</label>
                        <input value={editRoom.room_number} onChange={e => setEditRoom(r => ({ ...r, room_number: e.target.value }))} placeholder="e.g. 01" className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-none text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-left" />
                    </div>
                    <div className="space-y-1 text-left">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-surface-700 text-left">Room Name</label>
                        <input value={editRoom.room_name} onChange={e => setEditRoom(r => ({ ...r, room_name: e.target.value }))} placeholder="e.g. Interview Room A" className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-none text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-left" />
                    </div>

                    {/* Room Picture Selection / Upload */}
                    <div className="space-y-1.5 text-left">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-surface-700 text-left">Room Picture</label>
                        <div className="flex gap-3 items-center">
                            <div className="w-14 h-14 bg-surface-50 border border-surface-200 flex items-center justify-center overflow-hidden shrink-0">
                                {editRoom.image_url ? (
                                    <img src={editRoom.image_url} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <DoorOpen size={20} className="text-surface-300" />
                                )}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-2.5 py-1 bg-white border border-surface-350 text-[9px] font-black uppercase tracking-widest text-surface-700 hover:bg-surface-50 rounded-none transition-all flex items-center gap-1"
                                    >
                                        <Upload size={10} /> Upload
                                    </button>
                                    {editRoom.image_url && (
                                        <button 
                                            type="button" 
                                            onClick={() => setEditRoom(r => ({ ...r, image_url: '' }))}
                                            className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-[9px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 rounded-none transition-all"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <p className="text-[8px] text-surface-400 font-medium">JPEG, PNG, or base64 data.</p>
                            </div>
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-1 text-left">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-surface-700 text-left">Presets</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {PRESET_IMAGES.map((img) => (
                                <button
                                    key={img.name}
                                    type="button"
                                    onClick={() => setEditRoom(r => ({ ...r, image_url: img.url }))}
                                    className={cn(
                                        "h-10 border relative overflow-hidden group/preset rounded-none transition-all",
                                        editRoom.image_url === img.url ? "border-primary-600 ring-1 ring-primary-600" : "border-surface-200 hover:border-surface-300"
                                    )}
                                    title={img.name}
                                >
                                    <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover/preset:scale-110 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover/preset:opacity-100 transition-opacity">
                                        <span className="text-[7px] font-black text-white uppercase tracking-wider text-center px-0.5 truncate w-full">{img.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-3 text-left">
                        <button onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-surface-300 text-[10px] font-black uppercase tracking-widest text-surface-700 rounded-none hover:bg-surface-50 transition-all text-left text-center">Cancel</button>
                        <button onClick={onSave} className="flex-1 px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-none hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-left border border-emerald-700 shadow-sm">
                            {isSubmitting ? <><RefreshCw size={12} className="animate-spin text-left" /> Saving...</> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

interface ReceiptModalProps {
    receiptData: any;
    onClose: () => void;
}

export function ReceiptModal({ receiptData, onClose }: ReceiptModalProps) {
    if (!receiptData) return null;

    const rating = receiptData.ratings?.personalRating || 0;
    const langClass = receiptData.ratings?.languageClassification;
    const remarks = receiptData.ratings?.remarks;
    const verdict = receiptData.verdict || 'PENDING';
    const endorsement = receiptData.endorsementParams;

    return (
        <Modal open={!!receiptData} onClose={onClose} title="Interview Completed" size="md">
            <div className="py-2 px-1 text-slate-800 font-sans max-h-[85vh] overflow-y-auto">
                {/* Receipt Card Container */}
                <div className="bg-slate-50 rounded-none p-6 shadow-sm space-y-5 relative">
                    {/* Top Decorative Edge */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-primary-500 to-amber-500 rounded-none" />

                    {/* Header */}
                    <div className="text-center space-y-1 pt-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border-0">
                            <Sparkles size={10} /> Official Summary
                        </div>
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">Interview Session Summary</h2>
                        <p className="text-[10px] text-slate-400 font-mono">TXN: {Math.random().toString(36).substring(2, 10).toUpperCase()} • {receiptData.completedAt}</p>
                    </div>

                    <div className="border-t border-dashed border-slate-200 my-2" />

                    {/* Candidate Identity */}
                    <div className="flex items-center gap-4 bg-white p-4 rounded-none shadow-sm">
                        <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-black text-xl rounded-none shrink-0 shadow-sm">
                            {receiptData.applicantName.charAt(0)}
                        </div>
                        <div className="space-y-0.5 text-left min-w-0">
                            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight truncate">{receiptData.applicantName}</h3>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {receiptData.applicantId || 'N/A'}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">{receiptData.positionTitle} ({receiptData.department || 'N/A'})</p>
                        </div>
                    </div>

                    {/* Room & Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-left">
                        <div className="p-3 bg-white rounded-none shadow-sm space-y-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Timer size={12} className="text-emerald-500" /> Duration</p>
                            <p className="text-lg font-black text-slate-900 font-mono tracking-tight">{receiptData.duration}</p>
                        </div>
                        <div className="p-3 bg-white rounded-none shadow-sm space-y-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ClipboardCheck size={12} className="text-primary-500" /> Grading</p>
                            <p className="text-lg font-black text-slate-900 font-mono tracking-tight">{receiptData.answeredQuestions}/{receiptData.totalQuestions}</p>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-slate-200 my-2" />

                    {/* Interview Verdict & Ratings Summary */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Session Evaluation</h4>
                        
                        <div className="bg-white rounded-none p-4 shadow-sm space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Session Outcome</span>
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-none font-black text-[9px] uppercase tracking-wider",
                                    verdict === 'PASSED' ? "bg-emerald-50 text-emerald-700" :
                                    verdict === 'FAILED' ? "bg-rose-50 text-rose-700" :
                                    "bg-amber-50 text-amber-700"
                                )}>
                                    {verdict}
                                </span>
                            </div>

                            {rating > 0 && (
                                <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                    <span className="text-slate-500 font-medium">Interpersonal Rating</span>
                                    <div className="flex items-center gap-0.5 text-amber-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={11} fill={i < rating ? "currentColor" : "none"} className={i < rating ? "text-amber-500" : "text-slate-200"} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {langClass && (
                                <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                    <span className="text-slate-500 font-medium">Language Assessment</span>
                                    <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">{langClass}</span>
                                </div>
                            )}

                            {remarks && (
                                <div className="border-t border-slate-100 pt-2.5 space-y-1">
                                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Notes & Observations</span>
                                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-none border-0 leading-relaxed italic">
                                        "{remarks}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Endorsement Details */}
                    {verdict === 'PASSED' && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Endorsement & Next Steps</h4>
                            
                            <div className="bg-white rounded-none p-4 shadow-sm space-y-3 text-left">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Target Account/Department</span>
                                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] bg-slate-100 px-2 py-0.5 rounded-none">
                                        {endorsement?.department || receiptData.department || 'N/A'}
                                    </span>
                                </div>

                                {endorsement?.assignedOpsValidatorName && (
                                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                        <span className="text-slate-500 font-medium">Assigned Ops Validator</span>
                                        <span className="font-bold text-slate-850 flex items-center gap-1">
                                            <User size={11} className="text-slate-400" />
                                            {endorsement.assignedOpsValidatorName}
                                        </span>
                                    </div>
                                )}

                                {endorsement?.meetingDate && (
                                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                        <span className="text-slate-500 font-medium">Ops Val Interview Date</span>
                                        <span className="font-bold text-slate-850 flex items-center gap-1 font-mono text-[11px]">
                                            <Calendar size={11} className="text-slate-400" />
                                            {new Date(endorsement.meetingDate).toLocaleString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                    <span className="text-slate-500 font-medium">Calendar Integration</span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider",
                                        endorsement?.withOutlook 
                                            ? "bg-blue-50 text-blue-700" 
                                            : "bg-amber-50 text-amber-700"
                                    )}>
                                        {endorsement?.withOutlook ? '📧 Synced with Outlook' : '⏳ Pending Sync'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="pt-5">
                    <button 
                        onClick={onClose} 
                        className="w-full py-3.5 bg-slate-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-none transition-all border-0 flex items-center justify-center gap-2 shadow-md hover:shadow-black/10 active:scale-[0.99] cursor-pointer"
                    >
                        Finish & Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
