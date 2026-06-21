import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, ArrowRight, ChevronRight, Shield, Search, X } from 'lucide-react';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { PositionService } from '@/services/PositionService';
import { JobCategoryService } from '@/services/JobCategoryService';
import type { Position, JobCategory } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/common/PageTransition';

const JobCard = ({ position, onClick }: { position: Position, onClick: () => void }) => {
    return (
        <motion.button
            layout="position"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            transition={{
                opacity: { duration: 0.2 },
                layout: { type: 'spring', stiffness: 350, damping: 30 },
                default: { type: 'spring', stiffness: 300, damping: 18 }
            }}
            onClick={onClick}
            className="group relative bg-white rounded-xl text-left border border-surface-200 shadow-sm transition-all duration-300 hover:border-primary-400 hover:shadow-md h-full flex flex-col overflow-hidden w-full"
        >
            {position.image_url ? (
                <div className="w-full h-40 overflow-hidden relative z-10 bg-surface-100 shrink-0">
                    <img src={position.image_url} alt={position.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
            ) : null}

            <div className="p-6 flex flex-col flex-grow relative z-10">
                {position.department && (
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-3 bg-primary-500 rounded-full" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600">{position.department}</span>
                    </div>
                )}

                <h2 className="text-xl md:text-2xl font-semibold text-surface-900 mb-6 leading-tight group-hover:text-primary-600 transition-colors">
                    {position.title}
                </h2>

                <div className="mt-auto pt-6 border-t border-surface-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-surface-500 text-[11px] font-medium">
                            <MapPin size={12} className="text-surface-400" /> {position.location}
                        </div>
                        <div className="w-[1px] h-3 bg-surface-200" />
                        <div className="text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                            {position.employment_type}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-primary-600 font-bold text-[11px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        View Details <ChevronRight size={14} />
                    </div>
                </div>
            </div>

            {/* Fluent Hover Accent */}
            {!position.image_url && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-50 transition-opacity blur-2xl pointer-events-none" />
            )}
        </motion.button>
    );
};

export function JobPostings() {
    const navigate = useNavigate();
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Position | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState<JobCategory[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && !(event.target as HTMLElement).closest('.category-dropdown-container')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const activeCategoryName = categories.find(c => c.id === selectedCategory)?.name || 'All Categories';

    const filteredPositions = positions.filter(p => {
        const matchesSearch = 
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    useEffect(() => {
        let mounted = true;
        Promise.all([
            PositionService.getAll(),
            JobCategoryService.getAll()
        ])
            .then(([items, cats]) => {
                if (mounted) {
                    setPositions(items.filter((item) => item.status === 'OPEN' && !item.title.includes('[INTERNAL]') && !item.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA')));
                    setCategories(cats);
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, []);

    const proceedToApply = () => {
        if (!selected) {
            return;
        }
        setShowConfirm(false);
        navigate(`/apply?position_id=${encodeURIComponent(selected.id)}`);
    };

    const getPositionScore = (title: string) => {
        const t = title.toLowerCase();
        let score = 0;
        if (t.includes('bilingual')) {
            score += 100;
        }
        if (t.includes('voice')) {
            if (t.includes('non-voice') || t.includes('non voice')) {
                score += 80;
            } else {
                score += 90;
            }
        }
        if (t.includes('customer service') || t.includes('csr') || t.includes('agent') || t.includes('representative')) {
            score += 50;
        }
        return score;
    };

    const groupedPositions = React.useMemo(() => {
        const groups: { [key: string]: { category: JobCategory | null; positions: Position[] } } = {};

        categories.forEach(cat => {
            groups[cat.id] = { category: cat, positions: [] };
        });
        groups['uncategorized'] = { category: null, positions: [] };

        filteredPositions.forEach(pos => {
            const catId = pos.category_id || 'uncategorized';
            if (!groups[catId]) {
                groups[catId] = { category: null, positions: [] };
            }
            groups[catId].positions.push(pos);
        });

        const sortPositions = (a: Position, b: Position) => {
            const scoreA = getPositionScore(a.title);
            const scoreB = getPositionScore(b.title);
            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }
            return a.title.localeCompare(b.title);
        };

        Object.keys(groups).forEach(key => {
            groups[key].positions.sort(sortPositions);
        });

        const groupsArray = Object.values(groups).filter(g => g.positions.length > 0);

        groupsArray.sort((a, b) => {
            const nameA = a.category?.name.toLowerCase() || '';
            const nameB = b.category?.name.toLowerCase() || '';

            const isA_CS = nameA.includes('customer service') || nameA.includes('csr') || nameA.includes('agent');
            const isB_CS = nameB.includes('customer service') || nameB.includes('csr') || nameB.includes('agent');
            if (isA_CS && !isB_CS) return -1;
            if (!isA_CS && isB_CS) return 1;

            if (a.category && b.category) {
                return (a.category.sort_order || 0) - (b.category.sort_order || 0);
            }

            if (a.category === null) return 1;
            if (b.category === null) return -1;

            return nameA.localeCompare(nameB);
        });

        return groupsArray;
    }, [filteredPositions, categories]);

    if (loading) {
        return (
            <PageTransition>
                <div className="flex min-h-screen items-center justify-center bg-[#f3f2f1]">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div
                className="min-h-screen w-full relative text-white select-none overflow-x-hidden brand-gradient"
                style={{
                    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
                }}
            >
                {/* Premium Transparent Header */}
                <header className="fixed top-0 left-0 w-full z-[100] flex items-center justify-between px-10 py-5 bg-black/20 backdrop-blur-xl border-b border-white/10">
                    <div
                        onClick={() => navigate('/')}
                        className="flex items-center gap-4 cursor-pointer group transition-all"
                    >
                        <div className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden border border-white/20">
                            <img src="/contactpoint-logo.png?v=3" alt="CP360" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-white font-black text-[15px] tracking-[0.1em] uppercase leading-none">
                                ContactPoint<span className="text-[#ef3e36]">360</span>
                            </h1>
                            <span className="text-white/60 font-black text-[9px] tracking-[0.3em] uppercase mt-1">
                                Talent Acquisition
                            </span>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-10" onMouseLeave={() => setHoveredTab(null)}>
                        {['HOME', 'JOB POSTINGS', 'PORTAL'].map(item => {
                            const isActive = item === 'JOB POSTINGS';
                            return (
                                <div key={item} className="relative flex items-center justify-center h-full">
                                    <button
                                        onMouseEnter={() => setHoveredTab(item)}
                                        onClick={
                                            item === 'HOME' ? () => navigate('/login') :
                                                item === 'JOB POSTINGS' ? () => navigate('/jobs') :
                                                    item === 'PORTAL' ? () => navigate('/login?auth=true') :
                                                        undefined
                                        }
                                        className={`text-[12px] font-black tracking-[0.1em] transition-colors cursor-pointer py-1 uppercase ${isActive || hoveredTab === item ? 'text-white' : 'text-white/50'
                                            }`}
                                    >
                                        {item}
                                    </button>
                                    {(hoveredTab === item || (hoveredTab === null && isActive)) && (
                                        <motion.div
                                            layoutId="jobs-nav-underline"
                                            className="absolute -bottom-5 left-0 right-0 h-[3px] bg-[#ef3e36] rounded-full"
                                            transition={{ duration: 0.3, type: "spring", stiffness: 350, damping: 30 }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                </header>

                {/* Main Content Area */}
                <main className="relative z-10 pt-48 pb-32 px-8">
                    <div className="mx-auto max-w-7xl">
                        {/* Cinematic Hero Section */}
                        <div className="mb-24">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-[2px] w-12 bg-[#ef3e36]" />
                                    <span className="text-white font-black uppercase text-[11px] tracking-[0.4em]">
                                        Opportunity Hub
                                    </span>
                                </div>
                                <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-tight">
                                    Explore <br /><span className="text-[#ef3e36]">Openings</span>
                                </h1>
                                <p className="text-white/70 text-[18px] md:text-[20px] max-w-2xl font-medium leading-relaxed">
                                    Join a global network of professionals dedicated to customer experience excellence.
                                    Find your next career milestone below.
                                </p>

                                {positions.length > 0 && (
                                    <div className="pt-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                                        {/* Native Search Input */}
                                        <div className="relative flex-grow max-w-md">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search positions..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-8 py-2 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white rounded text-[13px] outline-none transition-all placeholder-white/50 border border-white/10"
                                            />
                                            {searchQuery && (
                                                <button 
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Custom Category Dropdown */}
                                        <div className="flex flex-wrap gap-4 items-center">
                                            <div className="relative category-dropdown-container">
                                                <button
                                                    onClick={() => setIsOpen(!isOpen)}
                                                    className="bg-white/10 hover:bg-white/15 text-white text-[13px] py-2 px-4 rounded outline-none border border-white/10 uppercase tracking-wider font-semibold flex items-center gap-2 select-none active:scale-[0.98] transition-all duration-300"
                                                >
                                                    <span>{activeCategoryName}</span>
                                                    <motion.svg 
                                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                        className="w-4 h-4 text-white/70" 
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                                    </motion.svg>
                                                </button>

                                                <AnimatePresence>
                                                    {isOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                                            transition={{ type: "spring", stiffness: 450, damping: 22 }}
                                                            className="absolute left-0 mt-2 w-64 bg-[#18181b] border border-white/10 rounded shadow-2xl overflow-hidden z-50 py-1"
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedCategory('');
                                                                    setIsOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors duration-300 ${
                                                                    !selectedCategory ? 'bg-[#ef3e36] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                                                                }`}
                                                            >
                                                                All Categories
                                                            </button>
                                                            {categories.map((cat) => (
                                                                <button
                                                                    key={cat.id}
                                                                    onClick={() => {
                                                                        setSelectedCategory(cat.id);
                                                                        setIsOpen(false);
                                                                    }}
                                                                    className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors duration-300 ${
                                                                        selectedCategory === cat.id ? 'bg-[#ef3e36] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                                                                    }`}
                                                                >
                                                                    {cat.name}
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {(searchQuery || selectedCategory) && (
                                                <button
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setSelectedCategory('');
                                                    }}
                                                    className="text-[11px] text-[#ef3e36] hover:text-white font-black uppercase tracking-wider transition-colors py-2 px-1 self-center"
                                                >
                                                    Reset Filters
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {positions.length === 0 ? (
                            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-24 text-center shadow-2xl">
                                <Briefcase className="mx-auto mb-6 text-white/10" size={64} />
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight">No Active Positions</h2>
                                <p className="mt-4 text-white/50 font-medium max-w-md mx-auto leading-relaxed">The talent hub is currently being updated. Please check back later for new career opportunities.</p>
                                <button
                                    onClick={() => navigate('/')}
                                    className="mt-12 px-12 py-4 bg-white text-black font-black text-[12px] uppercase tracking-[0.2em] rounded-sm hover:bg-[#ef3e36] hover:text-white transition-all shadow-xl inline-flex items-center gap-4 active:scale-[0.98]"
                                >
                                    Return to Homepage
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        ) : (
                            <>
                                {filteredPositions.length === 0 ? (
                                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-16 text-center shadow-2xl">
                                        <Search className="mx-auto mb-6 text-white/10" size={48} />
                                        <h2 className="text-xl font-black text-white uppercase tracking-tight">No Matching Vacancies</h2>
                                        <p className="mt-4 text-white/50 font-medium max-w-md mx-auto leading-relaxed text-[14px]">We couldn't find any positions matching your search queries or selected filters. Try adjusting your parameters.</p>
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                setSelectedCategory('');
                                            }}
                                            className="mt-8 px-8 py-3 bg-[#ef3e36] text-white font-black text-[11px] uppercase tracking-[0.15em] hover:bg-white hover:text-black transition-all shadow-xl active:scale-[0.98] rounded-sm"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-16">
                                        <AnimatePresence>
                                            {groupedPositions.map((group) => (
                                                <motion.div
                                                    key={group.category?.id || 'uncategorized'}
                                                    layout="position"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 20 }}
                                                    transition={{ duration: 0.5 }}
                                                    className="space-y-8"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <h2 className="text-2xl font-black uppercase tracking-[0.15em] text-white">
                                                            {group.category?.name || 'Other Vacancies'}
                                                        </h2>
                                                        <div className="h-[1px] flex-grow bg-white/10" />
                                                        <span className="px-3.5 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-wider text-white/60">
                                                            {group.positions.length} {group.positions.length === 1 ? 'Vacancy' : 'Vacancies'}
                                                        </span>
                                                    </div>

                                                    <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                                                        {group.positions.map((position) => (
                                                            <JobCard
                                                                key={position.id}
                                                                position={position}
                                                                onClick={() => {
                                                                    setSelected(position);
                                                                    setShowDetails(true);
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>

                {/* Premium Job Detail Modal */}
                <Modal
                    open={showDetails && !!selected}
                    onClose={() => setShowDetails(false)}
                    title={
                        <span className="flex items-center gap-3 text-white">
                            <img src="/contactpoint-logo.png?v=3" alt="CP360" className="w-5 h-5 object-contain" />
                            <span className="font-extrabold text-[13px] tracking-[0.08em] uppercase">ContactPoint<span className="text-[#ef3e36]">360</span></span>
                        </span>
                    }
                    size="xl"
                    dark={false}
                    className="rounded-none shadow-2xl border-0 overflow-hidden"
                    headerClassName="bg-black/30 backdrop-blur-md text-white border-b border-white/10"
                    closeButtonClassName="hover:bg-white/10 text-white/50 hover:text-white border-transparent"
                    overlayHeader
                >
                    {selected && (
                        <div className="relative -m-10">
                            {/* Hero Banner */}
                            <div className="relative w-full h-64 md:h-80 overflow-hidden">
                                {selected.image_url ? (
                                    <img src={selected.image_url} alt={selected.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full brand-gradient" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

                                {/* Floating Badge */}
                                <div className="absolute top-6 right-6">
                                    <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-sm">
                                        {selected.remaining_slots} {selected.remaining_slots === 1 ? 'Slot' : 'Slots'} Open
                                    </div>
                                </div>

                                {/* Hero Title */}
                                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                                    {selected.department && (
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <div className="h-[2px] w-8 bg-[#ef3e36]" />
                                            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#ef3e36]">{selected.department}</span>
                                        </div>
                                    )}
                                    <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                                        {selected.title}
                                    </h2>
                                </div>
                            </div>

                            {/* Info Pills Row */}
                            <div className="flex flex-wrap border-b border-surface-200 bg-surface-50">
                                <div className="flex items-center gap-2.5 px-8 py-4 border-r border-surface-200 min-w-[160px]">
                                    <MapPin size={14} className="text-[#ef3e36] shrink-0" />
                                    <div>
                                        <p className="text-[9px] font-extrabold text-surface-400 uppercase tracking-[0.15em] mb-0.5">Location</p>
                                        <p className="text-[13px] font-bold text-surface-900">{selected.location}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 px-8 py-4 border-r border-surface-200 min-w-[160px]">
                                    <Briefcase size={14} className="text-surface-400 shrink-0" />
                                    <div>
                                        <p className="text-[9px] font-extrabold text-surface-400 uppercase tracking-[0.15em] mb-0.5">Engagement</p>
                                        <p className="text-[13px] font-bold text-surface-900">{selected.employment_type}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 px-8 py-4 min-w-[160px]">
                                    <Shield size={14} className="text-surface-400 shrink-0" />
                                    <div>
                                        <p className="text-[9px] font-extrabold text-surface-400 uppercase tracking-[0.15em] mb-0.5">Arrangement</p>
                                        <p className="text-[13px] font-bold text-surface-900">{selected.work_arrangement}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Content Body */}
                            <div className="grid md:grid-cols-12 gap-0">
                                {/* Main Content */}
                                <div className="md:col-span-8 p-8 md:p-10 space-y-10 border-r border-surface-100">
                                    {/* Position Summary */}
                                    <section>
                                        <div className="flex items-center gap-2.5 mb-5">
                                            <div className="w-1 h-5 bg-surface-900 rounded-full" />
                                            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-surface-900">Position Summary</h3>
                                        </div>
                                        <p className="text-[14px] text-surface-600 leading-[1.8] font-medium">
                                            {selected.description}
                                        </p>
                                    </section>

                                    {/* Required Competencies */}
                                    <section>
                                        <div className="flex items-center gap-2.5 mb-5">
                                            <div className="w-1 h-5 bg-surface-900 rounded-full" />
                                            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-surface-900">Required Competencies</h3>
                                        </div>
                                        <div className="space-y-2">
                                            {(selected.qualifications || '').split(',').map((item) => item.trim()).filter(Boolean).map((item, idx) => (
                                                <div key={idx} className="flex items-start gap-3 py-3 px-4 bg-white border border-surface-100 transition-all hover:border-surface-300 hover:bg-surface-50 group">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#ef3e36] mt-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                                                    <span className="text-[13px] text-surface-600 font-semibold group-hover:text-surface-900 transition-colors">{item}</span>
                                                </div>
                                            ))}
                                            {!selected.qualifications && (
                                                <div className="py-6 px-4 bg-surface-50 border border-surface-100 border-dashed text-center">
                                                    <p className="text-[12px] text-surface-400 font-medium italic">Standard assessment and alignment protocols apply.</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                {/* Sidebar */}
                                <div className="md:col-span-4 p-8 md:p-8 bg-white">
                                    <div className="sticky top-0 space-y-8">
                                        {/* Apply CTA */}
                                        <div>
                                            <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-surface-900 mb-2">Ready to Apply?</h4>
                                            <p className="text-[12px] text-surface-400 font-medium leading-relaxed mb-6">
                                                Submit your application to enter the recruitment pipeline for this position.
                                            </p>

                                            <button
                                                onClick={() => setShowConfirm(true)}
                                                className="w-full bg-surface-900 text-white py-3.5 text-[11px] font-extrabold uppercase tracking-[0.15em] hover:bg-[#ef3e36] shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 group"
                                            >
                                                Apply for Position
                                                <ArrowRight size={14} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
                                            </button>
                                        </div>

                                        {/* Quick Facts */}
                                        <div className="border-t border-surface-100 pt-6 space-y-4">
                                            <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-surface-900 mb-3">Quick Facts</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-surface-400 font-semibold">Open Slots</span>
                                                    <span className="text-[11px] text-surface-900 font-extrabold">{selected.remaining_slots}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-surface-400 font-semibold">Location</span>
                                                    <span className="text-[11px] text-surface-900 font-extrabold">{selected.location}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-surface-400 font-semibold">Type</span>
                                                    <span className="text-[11px] text-surface-900 font-extrabold">{selected.employment_type}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="border-t border-surface-100 pt-6">
                                            <div className="flex items-center gap-2 text-surface-300 mb-1.5">
                                                <Shield size={11} strokeWidth={2.5} />
                                                <span className="text-[9px] font-extrabold uppercase tracking-[0.2em]">Secure Protocol</span>
                                            </div>
                                            <p className="text-[9px] text-surface-300 font-bold leading-relaxed tracking-wide">
                                                CONTACTPOINT 360 &mdash; TALENT ACQUISITION
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>

                <ConfirmDialog
                    open={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={proceedToApply}
                    title={<span className="flex items-center gap-2"><Shield size={14} className="text-slate-400" /> READY TO INITIALIZE?</span>}
                    message={`This will open the secure candidate gateway for the ${selected?.title?.toUpperCase()} recruitment sequence. Proceed?`}
                    confirmText="PROCEED"
                    confirmClass="bg-slate-900 text-white font-black uppercase tracking-[0.25em] border border-slate-900 hover:bg-brand-red hover:border-brand-red rounded-none px-10 transition-all shadow-lg shadow-slate-200"
                    dark={false}
                />
            </div>
        </PageTransition>
    );
}
