import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, ArrowRight, ChevronRight, Shield, Search, X, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, Clock, AlertTriangle } from 'lucide-react';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { PositionService } from '@/services/PositionService';
import { JobCategoryService } from '@/services/JobCategoryService';
import { ApplicationService } from '@/services/ApplicationService';
import type { Position, JobCategory } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/common/PageTransition';
import { TypingTestComponent } from '@/components/features/TypingTest/TypingTestComponent';
import { cooldownService } from '@/services/cooldownService';

const JobCard = ({ position, onClick }: { position: Position, onClick: () => void }) => {
    return (
        <motion.button
            layout="position"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{
                opacity: { duration: 0.2 },
                layout: { type: 'spring', stiffness: 350, damping: 30 },
                default: { type: 'spring', stiffness: 300, damping: 18 }
            }}
            onClick={onClick}
            className="group relative bg-neutral-900/90 hover:bg-neutral-900 rounded-xl text-left border border-neutral-800 hover:border-white shadow-xl transition-all duration-300 h-full flex flex-col overflow-hidden w-full cursor-pointer"
        >
            <div className="p-6 flex flex-col flex-grow relative z-10">
                <div className="flex items-center justify-between mb-4">
                    {position.department ? (
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-300">
                                {position.department}
                            </span>
                        </div>
                    ) : (
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500">
                            General Opening
                        </span>
                    )}

                    {position.image_url && (
                        <div className="w-7 h-7 bg-white/10 rounded-lg p-1 flex items-center justify-center">
                            <img src={position.image_url} alt="" className="w-full h-full object-contain filter invert" />
                        </div>
                    )}
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-white mb-4 leading-tight group-hover:text-neutral-200 transition-colors">
                    {position.title}
                </h2>

                {position.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-6 font-normal">
                        {position.description}
                    </p>
                )}

                <div className="mt-auto pt-5 border-t border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-medium">
                            <MapPin size={13} className="text-neutral-500" /> {position.location || 'Remote / Cebu'}
                        </div>
                        <div className="w-[1px] h-3 bg-neutral-800" />
                        <div className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">
                            {position.employment_type || 'Full-time'}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-white font-extrabold text-[11px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                        <span>Details</span>
                        <ChevronRight size={14} />
                    </div>
                </div>
            </div>
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

    const [showResyncInput, setShowResyncInput] = useState(false);
    const [resyncEmail, setResyncEmail] = useState('');
    const [isResyncing, setIsResyncing] = useState(false);
    const [resyncError, setResyncError] = useState('');

    const [activeMainTab, setActiveMainTab] = useState<'job_postings' | 'retakers'>('job_postings');

    // Retakers specific state
    const [retakerFirstName, setRetakerFirstName] = useState('');
    const [retakerLastName, setRetakerLastName] = useState('');
    const [retakerEmail, setRetakerEmail] = useState('');
    const [retakerLoading, setRetakerLoading] = useState(false);
    const [retakerError, setRetakerError] = useState('');
    const [retakerApplicant, setRetakerApplicant] = useState<any>(null);
    const [showRetakeTest, setShowRetakeTest] = useState(false);
    const [retakeSubmitted, setRetakeSubmitted] = useState(false);
    const [showPastResults, setShowPastResults] = useState(false);

    const handleCheckRetakeEligibility = async () => {
        if (!retakerFirstName || !retakerLastName || !retakerEmail) {
            setRetakerError('Please fill in all fields.');
            return;
        }
        setRetakerLoading(true);
        setRetakerError('');
        setRetakerApplicant(null);
        try {
            const data = await ApplicationService.syncCandidateData(retakerEmail);
            if (data && data.application) {
                const app = data.application;
                let parsedMetadata = app.metadata;
                if (typeof parsedMetadata === 'string') {
                    try { parsedMetadata = JSON.parse(parsedMetadata); } catch (e) { }
                }
                app.metadata = parsedMetadata;
                app.pis = parsedMetadata?.pis || {};
                app.position = { title: app.position_title };
                app.status = app.current_status;

                const pisFirst = (app.pis.first_name || parsedMetadata?.first_name || app.applicant_name?.split(' ')[0] || '').toLowerCase().trim();
                const pisLast = (app.pis.last_name || parsedMetadata?.last_name || app.applicant_name?.split(' ').slice(1).join(' ') || '').toLowerCase().trim();
                const inputFirst = retakerFirstName.toLowerCase().trim();
                const inputLast = retakerLastName.toLowerCase().trim();
                console.log({ pisFirst, pisLast, inputFirst, inputLast, parsedMetadata });

                if (pisFirst === inputFirst && pisLast === inputLast) {
                    setRetakerApplicant(app);
                } else {
                    setRetakerError('No matching application found for these details.');
                }
            } else {
                setRetakerError('No application found for this email.');
            }
        } catch (err: any) {
            setRetakerError(err.response?.data?.error || 'Failed to fetch application details.');
        } finally {
            setRetakerLoading(false);
        }
    };

    const handleRetakeComplete = async (result: any, isPassed: boolean) => {
        if (!retakerApplicant) return;
        try {
            setShowRetakeTest(false);
            setRetakeSubmitted(true);

            // Clean up other states if necessary, but we'll show a dedicated UI instead.
            // Don't setRetakerApplicant(null) yet so we can display their name in the success screen.
            setRetakerFirstName('');
            setRetakerLastName('');
            setRetakerEmail('');
        } catch (err) {
            alert("Failed to submit retake results. Please try again.");
        }
    };

    const handleResync = async () => {
        if (!resyncEmail) return;
        setIsResyncing(true);
        setResyncError('');
        try {
            const data = await ApplicationService.syncCandidateData(resyncEmail);
            if (data.application) {
                let formDraft = data.application.metadata || {};
                const draft = {
                    currentStep: 1,
                    form: formDraft
                };
                localStorage.setItem('candidate_form_draft', JSON.stringify(draft));
            }
            if (data.typing_test_result) {
                localStorage.setItem('typing_test_latest_result', JSON.stringify(data.typing_test_result));
            }
            navigate('/apply');
        } catch (error: any) {
            setResyncError(error.response?.data?.error || 'Failed to sync data');
        } finally {
            setIsResyncing(false);
        }
    };

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
            if (!a.category && b.category) return 1;
            if (a.category && !b.category) return -1;
            if (!a.category && !b.category) return 0;

            const nameA = a.category?.name.toLowerCase() || '';
            const nameB = b.category?.name.toLowerCase() || '';

            const isA_CS = nameA.includes('customer service') || nameA.includes('csr') || nameA.includes('agent');
            const isB_CS = nameB.includes('customer service') || nameB.includes('csr') || nameB.includes('agent');
            if (isA_CS && !isB_CS) return -1;
            if (!isA_CS && isB_CS) return 1;

            if (a.category && b.category) {
                return (a.category.sort_order || 0) - (b.category.sort_order || 0);
            }

            return nameA.localeCompare(nameB);
        });

        return groupsArray;
    }, [filteredPositions, categories]);

    const applicantName = retakerApplicant ? `${retakerApplicant.pis?.first_name} ${retakerApplicant.pis?.last_name}` : '';
    const attemptsCount = applicantName ? cooldownService.getAttempts(applicantName) : 0;
    const isOnCooldown = applicantName ? cooldownService.isNameOnCooldown(applicantName) : false;
    const cooldownRemaining = isOnCooldown ? cooldownService.getRemainingCooldown(applicantName) : '';

    const pastAttemptsStr = retakerApplicant ? localStorage.getItem(`typing_test_attempts_${retakerApplicant.pis?.email || retakerEmail}`) : null;
    const pastAttempts = pastAttemptsStr ? JSON.parse(pastAttemptsStr) : [];

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
                className="min-h-screen w-full relative text-white select-none overflow-x-hidden bg-black"
                style={{
                    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
                }}
            >
                {/* Premium Transparent Header */}
                <header className="fixed top-0 left-0 w-full z-[100] flex items-center justify-between px-10 py-5 bg-black/70 backdrop-blur-xl border-b border-neutral-800">
                    <div
                        onClick={() => navigate('/')}
                        className="flex items-center gap-3 cursor-pointer group transition-all"
                    >
                        <div className="w-8 h-8 bg-white text-black font-black rounded-lg shadow-lg flex items-center justify-center text-sm">
                            C
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-white font-black text-sm uppercase leading-none tracking-tight">
                                CHRONICLE<span className="text-neutral-400">CRM</span>
                            </h1>
                            <span className="text-neutral-500 font-bold text-[8px] tracking-[0.25em] uppercase mt-1">
                                Careers Hub
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
                                        className={`text-[12px] font-black tracking-[0.1em] transition-colors cursor-pointer py-1 uppercase ${isActive || hoveredTab === item ? 'text-white' : 'text-neutral-400 hover:text-white'
                                            }`}
                                    >
                                        {item}
                                    </button>
                                    {(hoveredTab === item || (hoveredTab === null && isActive)) && (
                                        <motion.div
                                            layoutId="jobs-nav-underline"
                                            className="absolute -bottom-5 left-0 right-0 h-[2px] bg-white rounded-full"
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
                    <div className="mx-auto max-w-[1600px]">
                        {/* Cinematic Hero Section */}
                        <div className="mb-24">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-[2px] w-12 bg-white" />
                                    <span className="text-neutral-400 font-black uppercase text-[11px] tracking-[0.4em]">
                                        Opportunity Hub
                                    </span>
                                </div>
                                <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-tight">
                                    Explore <br /><span className="text-neutral-400">Openings</span>
                                </h1>
                                <p className="text-neutral-400 text-[18px] md:text-[20px] max-w-2xl font-medium leading-relaxed">
                                    Join an elite network of tech operations and enterprise specialists.
                                    Discover and apply for active team allocations below.
                                </p>

                                {/* Premium Tab Switcher */}
                                <div className="pt-6 pb-2">
                                    <div className="inline-flex items-center p-1.5 bg-neutral-900 border border-neutral-800 rounded-full">
                                        {['job_postings', 'retakers'].map((tab) => {
                                            const isActive = activeMainTab === tab;
                                            return (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveMainTab(tab as any)}
                                                    className={`relative px-6 py-2.5 rounded-full text-[12px] font-black tracking-widest uppercase transition-all duration-300 ${isActive ? 'text-black font-extrabold shadow-lg' : 'text-neutral-400 hover:text-white'
                                                        }`}
                                                >
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="active-main-tab"
                                                            className="absolute inset-0 bg-white rounded-full"
                                                            initial={false}
                                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                        />
                                                    )}
                                                    <span className="relative z-10">
                                                        {tab.replace('_', ' ')}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {activeMainTab === 'job_postings' && positions.length > 0 && (
                                    <div className="pt-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                                        {/* Native Search Input */}
                                        <div className="relative flex-grow max-w-md">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search positions..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-8 py-2.5 bg-neutral-900 focus:bg-neutral-900 text-white rounded-lg text-[13px] outline-none transition-all placeholder-neutral-500 border border-neutral-800 focus:border-white"
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
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
                                                    className="bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] py-2.5 px-4 rounded-lg outline-none border border-neutral-800 uppercase tracking-wider font-semibold flex items-center gap-2 select-none active:scale-[0.98] transition-all cursor-pointer"
                                                >
                                                    <span>{activeCategoryName}</span>
                                                    <motion.svg
                                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                        className="w-4 h-4 text-neutral-400"
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
                                                            className="absolute left-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl overflow-hidden z-50 py-1"
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedCategory('');
                                                                    setIsOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer ${!selectedCategory ? 'bg-white text-black' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
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
                                                                    className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer ${selectedCategory === cat.id ? 'bg-white text-black' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
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
                                                    className="text-[11px] text-neutral-300 hover:text-white underline font-black uppercase tracking-wider transition-colors py-2 px-1 self-center cursor-pointer"
                                                >
                                                    Reset Filters
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {activeMainTab === 'job_postings' && (
                            positions.length === 0 ? (
                                <div className="bg-white/5 dark:bg-slate-900/5 backdrop-blur-xl rounded-2xl border border-white/10 p-24 text-center shadow-2xl">
                                    <Briefcase className="mx-auto mb-6 text-white/10" size={64} />
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">No Active Positions</h2>
                                    <p className="mt-4 text-white/50 font-medium max-w-md mx-auto leading-relaxed">The talent hub is currently being updated. Please check back later for new career opportunities.</p>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="mt-12 px-12 py-4 bg-white text-black font-black text-[12px] uppercase tracking-[0.2em] rounded-sm hover:bg-neutral-200 transition-all shadow-xl inline-flex items-center gap-4 active:scale-[0.98]"
                                    >
                                        Return to Homepage
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {filteredPositions.length === 0 ? (
                                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-16 text-center shadow-2xl">
                                            <Search className="mx-auto mb-6 text-neutral-600" size={48} />
                                            <h2 className="text-xl font-black text-white uppercase tracking-tight">No Matching Vacancies</h2>
                                            <p className="mt-4 text-neutral-400 font-medium max-w-md mx-auto leading-relaxed text-[14px]">We couldn't find any positions matching your search queries or selected filters. Try adjusting your parameters.</p>
                                            <button
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setSelectedCategory('');
                                                }}
                                                className="mt-8 px-8 py-3 bg-white text-black font-black text-[11px] uppercase tracking-[0.15em] hover:bg-neutral-200 transition-all shadow-xl active:scale-[0.98] rounded-sm"
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
                                                            <div className="h-[1px] flex-grow bg-neutral-800" />
                                                            <span className="px-3.5 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[10px] font-black uppercase tracking-wider text-neutral-400">
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
                            ))}

                        {activeMainTab === 'retakers' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 md:p-16 text-center"
                            >
                                {retakeSubmitted ? (
                                    <div className="max-w-md mx-auto py-12">
                                        <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle2 className="text-white" size={36} />
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Retake Submitted!</h2>
                                        <p className="text-neutral-400 max-w-lg mx-auto leading-relaxed text-lg mb-8">
                                            Your results have been securely recorded. The recruitment team has been notified and your application status will be updated after review.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setRetakeSubmitted(false);
                                                setRetakerApplicant(null);
                                            }}
                                            className="w-full px-8 py-4 bg-white text-black font-black uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition-all shadow-lg active:scale-95"
                                        >
                                            Return to Portal
                                        </button>
                                    </div>
                                ) : !retakerApplicant ? (
                                    <>
                                        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <RefreshCw className="text-white" size={28} />
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Retaker Portal</h2>
                                        <p className="text-neutral-400 max-w-lg mx-auto leading-relaxed text-lg mb-8">
                                            Please enter your details below to verify your eligibility for a retake.
                                            If eligible, you will be redirected to the assessment.
                                        </p>

                                        <div className="flex flex-col gap-4 max-w-md mx-auto">
                                            <input
                                                type="text"
                                                placeholder="First Name"
                                                value={retakerFirstName}
                                                onChange={(e) => setRetakerFirstName(e.target.value)}
                                                className="w-full px-6 py-4 rounded-xl bg-black border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Last Name"
                                                value={retakerLastName}
                                                onChange={(e) => setRetakerLastName(e.target.value)}
                                                className="w-full px-6 py-4 rounded-xl bg-black border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                                            />
                                            <input
                                                type="email"
                                                placeholder="Email Address"
                                                value={retakerEmail}
                                                onChange={(e) => setRetakerEmail(e.target.value)}
                                                className="w-full px-6 py-4 rounded-xl bg-black border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                                            />
                                            {retakerError && (
                                                <div className="text-neutral-300 text-sm font-bold bg-neutral-800 border border-neutral-700 py-2 px-4 rounded-lg mt-2">
                                                    {retakerError}
                                                </div>
                                            )}
                                            <button
                                                onClick={handleCheckRetakeEligibility}
                                                disabled={retakerLoading}
                                                className="mt-4 w-full px-8 py-4 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-black uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95"
                                            >
                                                {retakerLoading ? 'Verifying...' : 'Check Eligibility'}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {showRetakeTest ? (
                                            <div className="text-left mt-4 border border-neutral-800 rounded-xl overflow-hidden bg-black p-4">
                                                <button onClick={() => setShowRetakeTest(false)} className="mb-4 text-neutral-400 hover:text-white text-sm font-bold flex items-center gap-2">
                                                    ← Back to candidate info
                                                </button>
                                                <div className="min-h-[500px]">
                                                    <TypingTestComponent
                                                        applicantName={`${retakerApplicant.pis?.first_name || ''} ${retakerApplicant.pis?.last_name || ''}`.trim()}
                                                        applicantEmail={retakerApplicant.pis?.email || retakerEmail}
                                                        onComplete={handleRetakeComplete}
                                                        onCancel={() => setShowRetakeTest(false)}
                                                        isRetake={true}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="max-w-md mx-auto">
                                                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <Shield className="text-white" size={28} />
                                                </div>
                                                <h2 className="text-2xl font-black text-white mb-2">Application Found</h2>
                                                <p className="text-neutral-400 mb-6 text-sm">
                                                    Welcome back, <strong>{retakerApplicant.pis?.first_name} {retakerApplicant.pis?.last_name}</strong>.
                                                </p>
                                                <div className="bg-black rounded-xl p-4 mb-8 text-left border border-neutral-800 space-y-3">
                                                    <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                                                        <span className="text-neutral-400 text-[11px] uppercase tracking-wider font-bold">Position</span>
                                                        <span className="text-white font-medium text-sm">{retakerApplicant.position?.title || 'Unknown'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                                                        <span className="text-neutral-400 text-[11px] uppercase tracking-wider font-bold">Current Status</span>
                                                        <span className="px-2 py-1 bg-neutral-800 rounded text-xs font-bold text-white">
                                                             {retakerApplicant.pis?.final_specific_status || retakerApplicant.status || 'OPEN'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center pb-1">
                                                        <span className="text-neutral-400 text-[11px] uppercase tracking-wider font-bold">Attempts Left</span>
                                                        <span className="px-2 py-1 bg-neutral-800 rounded text-xs font-bold text-white flex items-center gap-1">
                                                            {3 - attemptsCount}
                                                        </span>
                                                    </div>
                                                    {isOnCooldown && (
                                                        <div className="flex justify-between items-center pt-2 pb-1 text-neutral-300">
                                                            <span className="text-neutral-400 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1"><AlertTriangle size={12} /> Reset In</span>
                                                            <span className="text-xs font-bold flex items-center gap-1">
                                                                <Clock size={12} /> {cooldownRemaining}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {pastAttempts.length > 0 && (
                                                    <div className="mb-8">
                                                        <button
                                                            onClick={() => setShowPastResults(!showPastResults)}
                                                            className="w-full flex items-center justify-between p-3 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-white text-sm font-bold transition-all border border-neutral-800"
                                                        >
                                                            <span>View Past Results ({pastAttempts.length})</span>
                                                            {showPastResults ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </button>
                                                        <AnimatePresence>
                                                            {showPastResults && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="pt-3 space-y-2">
                                                                        {pastAttempts.map((attempt: any, idx: number) => (
                                                                            <div key={idx} className="bg-black border border-neutral-800 rounded-lg p-3 grid grid-cols-4 gap-2 text-center text-white text-xs">
                                                                                <div>
                                                                                    <div className="text-neutral-400 text-[9px] uppercase tracking-wider mb-1 font-bold">WPM</div>
                                                                                    <div className="font-black text-sm">{attempt.wpm}</div>
                                                                                </div>
                                                                                <div>
                                                                                    <div className="text-neutral-400 text-[9px] uppercase tracking-wider mb-1 font-bold">Acc</div>
                                                                                    <div className="font-black text-sm">{attempt.accuracy}%</div>
                                                                                </div>
                                                                                <div>
                                                                                    <div className="text-neutral-400 text-[9px] uppercase tracking-wider mb-1 font-bold">Time</div>
                                                                                    <div className="font-black text-sm">{attempt.timeTaken}s</div>
                                                                                </div>
                                                                                <div>
                                                                                    <div className="text-neutral-400 text-[9px] uppercase tracking-wider mb-1 font-bold">Errors</div>
                                                                                    <div className="font-black text-neutral-300 text-sm">{attempt.errors}</div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-3">
                                                    <button
                                                        onClick={() => setShowRetakeTest(true)}
                                                        disabled={isOnCooldown || attemptsCount >= 3}
                                                        className={`w-full px-8 py-4 text-black font-black uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isOnCooldown || attemptsCount >= 3
                                                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50'
                                                                : 'bg-white hover:bg-neutral-200 active:scale-95'
                                                            }`}
                                                    >
                                                        <RefreshCw size={18} />
                                                        {isOnCooldown || attemptsCount >= 3 ? 'Retakes Exhausted' : 'Start Typing Test Retake'}
                                                    </button>
                                                    <button
                                                        onClick={() => setRetakerApplicant(null)}
                                                        className="w-full px-8 py-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-black uppercase tracking-wider rounded-xl transition-all border border-neutral-800"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        )}
                    </div>
                </main>

                {/* Premium Job Detail Modal */}
                <Modal
                    open={showDetails && !!selected}
                    onClose={() => setShowDetails(false)}
                    title={
                        <span className="flex items-center gap-3 text-white">
                            <span className="w-5 h-5 rounded bg-white text-black font-black flex items-center justify-center text-[10px]">C</span>
                            <span className="font-extrabold text-[13px] tracking-[0.12em] uppercase">ChronicleCRM</span>
                        </span>
                    }
                    size="xl"
                    dark={true}
                    className="rounded-xl shadow-2xl border border-neutral-800 bg-neutral-950 overflow-hidden"
                    headerClassName="bg-black text-white border-b border-neutral-800"
                    closeButtonClassName="hover:bg-neutral-800 text-neutral-400 hover:text-white border-transparent"
                    overlayHeader
                >
                    {selected && (
                        <div className="relative -m-10">
                            {/* Hero Banner */}
                            <div className="relative w-full h-64 md:h-80 overflow-hidden bg-neutral-900 border-b border-neutral-800">
                                {selected.image_url ? (
                                    <img src={selected.image_url} alt={selected.title} className="w-full h-full object-cover grayscale opacity-70" />
                                ) : (
                                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                                        <span className="text-neutral-800 font-black text-8xl select-none tracking-widest uppercase">CHRONICLE</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent" />

                                {/* Floating Badge */}
                                <div className="absolute top-6 right-6">
                                    <div className="px-4 py-1.5 bg-black/80 backdrop-blur-md border border-neutral-700 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-sm">
                                        {selected.remaining_slots} {selected.remaining_slots === 1 ? 'Slot' : 'Slots'} Open
                                    </div>
                                </div>

                                {/* Hero Title */}
                                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                                    {selected.department && (
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <div className="h-[2px] w-8 bg-white" />
                                            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-neutral-300">{selected.department}</span>
                                        </div>
                                    )}
                                    <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                                        {selected.title}
                                    </h2>
                                </div>
                            </div>

                            {/* Info Pills Row */}
                            <div className="flex flex-wrap border-b border-neutral-800 bg-neutral-900/60">
                                <div className="flex items-center gap-2.5 px-8 py-4 border-r border-neutral-800 min-w-[160px]">
                                    <MapPin size={14} className="text-white shrink-0" />
                                    <div>
                                        <p className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-[0.15em] mb-0.5">Location</p>
                                        <p className="text-[13px] font-bold text-white">{selected.location || 'Remote / Hybrid'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 px-8 py-4 border-r border-neutral-800 min-w-[160px]">
                                    <Briefcase size={14} className="text-neutral-400 shrink-0" />
                                    <div>
                                        <p className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-[0.15em] mb-0.5">Engagement</p>
                                        <p className="text-[13px] font-bold text-white">{selected.employment_type || 'Full-time'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 px-8 py-4 min-w-[160px]">
                                    <Shield size={14} className="text-neutral-400 shrink-0" />
                                    <div>
                                        <p className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-[0.15em] mb-0.5">Arrangement</p>
                                        <p className="text-[13px] font-bold text-white">{selected.work_arrangement || 'Onsite / Flexible'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Content Body */}
                            <div className="grid md:grid-cols-12 gap-0 bg-neutral-950">
                                {/* Main Content */}
                                <div className="md:col-span-8 p-8 md:p-10 space-y-10 border-r border-neutral-800">
                                    {/* Position Summary */}
                                    <section>
                                        <div className="flex items-center gap-2.5 mb-5">
                                            <div className="w-1 h-5 bg-white rounded-full" />
                                            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-white">Position Summary</h3>
                                        </div>
                                        <p className="text-[14px] text-neutral-300 leading-[1.8] font-medium">
                                            {selected.description}
                                        </p>
                                    </section>

                                    {/* Required Competencies */}
                                    <section>
                                        <div className="flex items-center gap-2.5 mb-5">
                                            <div className="w-1 h-5 bg-white rounded-full" />
                                            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-white">Required Competencies</h3>
                                        </div>
                                        <div className="space-y-2">
                                            {(selected.qualifications || '').split(',').map((item) => item.trim()).filter(Boolean).map((item, idx) => (
                                                <div key={idx} className="flex items-start gap-3 py-3 px-4 bg-neutral-900 border border-neutral-800 transition-all hover:border-neutral-600 group">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                                                    <span className="text-[13px] text-neutral-300 font-semibold group-hover:text-white transition-colors">{item}</span>
                                                </div>
                                            ))}
                                            {!selected.qualifications && (
                                                <div className="py-6 px-4 bg-neutral-900/50 border border-neutral-800 border-dashed text-center">
                                                    <p className="text-[12px] text-neutral-400 font-medium italic">Standard assessment and alignment protocols apply.</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                {/* Sidebar */}
                                <div className="md:col-span-4 p-8 md:p-8 bg-neutral-900">
                                    <div className="sticky top-0 space-y-8">
                                        {/* Apply CTA */}
                                        <div>
                                            <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white mb-2">Ready to Apply?</h4>
                                            <p className="text-[12px] text-neutral-400 font-medium leading-relaxed mb-6">
                                                Submit your application to enter the recruitment pipeline for this position.
                                            </p>

                                            <button
                                                onClick={() => setShowConfirm(true)}
                                                className="w-full bg-white text-black py-3.5 text-[11px] font-extrabold uppercase tracking-[0.15em] hover:bg-neutral-200 shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 group"
                                            >
                                                Apply for Position
                                                <ArrowRight size={14} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
                                            </button>
                                        </div>

                                        {/* Quick Facts */}
                                        <div className="border-t border-neutral-800 pt-6 space-y-4">
                                            <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white mb-3">Quick Facts</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-neutral-400 font-semibold">Open Slots</span>
                                                    <span className="text-[11px] text-white font-extrabold">{selected.remaining_slots}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-neutral-400 font-semibold">Location</span>
                                                    <span className="text-[11px] text-white font-extrabold">{selected.location}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-neutral-400 font-semibold">Type</span>
                                                    <span className="text-[11px] text-white font-extrabold">{selected.employment_type}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="border-t border-neutral-800 pt-6">
                                            <div className="flex items-center gap-2 text-neutral-400 mb-1.5">
                                                <Shield size={11} strokeWidth={2.5} />
                                                <span className="text-[9px] font-extrabold uppercase tracking-[0.2em]">Secure Protocol</span>
                                            </div>
                                            <p className="text-[9px] text-neutral-500 font-bold leading-relaxed tracking-wide">
                                                CHRONICLECRM &mdash; TALENT PLATFORM
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
                    title={<span className="flex items-center gap-2 text-white"><Shield size={14} className="text-white" /> READY TO INITIALIZE?</span>}
                    message={`This will open the secure candidate gateway for the ${selected?.title?.toUpperCase()} recruitment sequence. Proceed?`}
                    confirmText="PROCEED"
                    confirmClass="bg-white text-black font-black uppercase tracking-[0.25em] border border-white hover:bg-neutral-200 rounded-none px-10 transition-all shadow-lg"
                    dark={true}
                />
            </div>
        </PageTransition>
    );
}
