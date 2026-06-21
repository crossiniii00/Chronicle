import React from 'react';
import { Search, Building2, Users, Calendar, Filter, Grid, List, Briefcase, RefreshCw } from 'lucide-react';
import { useEmployeeTracker } from './employee-tracker/hooks/useEmployeeTracker';
import { TrackerHeader, EmployeeDetailModal } from './employee-tracker/components/TrackerOverlays';
import { SectionHeader, StaffCard, StaffTable } from './employee-tracker/components/StaffUI';
import { cn } from '@/utils/formatters';

export function EmployeeTracker() {
    const {
        loading, selectedUser, setSelectedUser,
        searchQuery, setSearchQuery,
        deptFilter, setDeptFilter,
        jobFilter, setJobFilter,
        dateRange, setDateRange,
        modalTab, setModalTab, modalDateFilter, setModalDateFilter,
        modalCustomDate, setModalCustomDate, modalStatFilter, setModalStatFilter,
        viewMode, setViewMode, activeTab, setActiveTab,
        groupedStats, positions, updateApplicantStatus,
        accountsList, recruiterRolesList, getLabel
    } = useEmployeeTracker();

    return (
        <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 md:px-8 text-left">
            <TrackerHeader />

            {/* Search, Filter & Controls Dashboard Frame */}
            <div className="bg-white border border-surface-200 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    
                    {/* Search Field */}
                    <div className="w-full lg:flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-650 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search operational staff by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface-50 hover:bg-surface-100/50 focus:bg-white border border-surface-200 focus:border-primary-500 rounded-xl py-3 pl-12 pr-4 text-sm font-semibold outline-none transition-all"
                        />
                    </div>

                    {/* View Controls & Toggles */}
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        {/* Date Range Selector */}
                        <div className="relative">
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value as any)}
                                className="appearance-none bg-white border border-surface-200 rounded-xl pl-10 pr-8 py-3 text-xs font-black uppercase tracking-wider text-surface-700 hover:border-primary-500 cursor-pointer focus:outline-none transition-colors"
                            >
                                <option value="ALL">All Time</option>
                                <option value="TODAY">Today</option>
                                <option value="WEEK">This Week</option>
                                <option value="MONTH">This Month</option>
                                <option value="YEAR">This Year</option>
                            </select>
                            <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                        </div>

                        {/* View Switcher Grid/List */}
                        <div className="flex items-center gap-1.5 bg-surface-100 p-1.5 rounded-xl border border-surface-200/60 shadow-inner">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 transition-all rounded-lg",
                                    viewMode === 'grid' 
                                        ? "bg-white text-primary-600 shadow-sm scale-105" 
                                        : "text-surface-500 hover:text-surface-800"
                                )}
                                title="Grid View"
                            >
                                <Grid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-2 transition-all rounded-lg",
                                    viewMode === 'list' 
                                        ? "bg-white text-primary-600 shadow-sm scale-105" 
                                        : "text-surface-500 hover:text-surface-800"
                                )}
                                title="List View"
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Secondary Filters Bar */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-surface-100">
                    <div className="flex items-center gap-2 text-xs font-black text-surface-400 uppercase tracking-wider mr-2">
                        <Filter size={12} />
                        Filter By:
                    </div>

                    {/* Conditional Sector / Account / Account Type Filter */}
                    {activeTab === 'ops' ? (
                        <div className="relative">
                            <select
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                className="appearance-none bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl pl-9 pr-8 py-2 text-[10px] font-black uppercase tracking-wider text-surface-700 cursor-pointer focus:outline-none transition-colors"
                            >
                                <option value="ALL">All Accounts</option>
                                {accountsList.map(acc => (
                                    <option key={acc} value={acc}>{acc}</option>
                                ))}
                            </select>
                            <Building2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                        </div>
                    ) : (
                        <div className="relative">
                            <select
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                className="appearance-none bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl pl-9 pr-8 py-2 text-[10px] font-black uppercase tracking-wider text-surface-700 cursor-pointer focus:outline-none transition-colors"
                            >
                                <option value="ALL">All Account Types</option>
                                {recruiterRolesList.map(role => (
                                    <option key={role} value={role}>{getLabel(role)}</option>
                                ))}
                            </select>
                            <Users size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                        </div>
                    )}

                    {/* Position Filter - Hidden for Ops Validator */}
                    {activeTab !== 'ops' && (
                        <div className="relative">
                            <select
                                value={jobFilter}
                                onChange={(e) => setJobFilter(e.target.value)}
                                className="appearance-none bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl pl-9 pr-8 py-2 text-[10px] font-black uppercase tracking-wider text-surface-700 cursor-pointer focus:outline-none transition-colors max-w-[200px] truncate"
                            >
                                <option value="ALL">All Positions</option>
                                {positions.map(pos => (
                                    <option key={pos.id} value={pos.id}>{pos.title}</option>
                                ))}
                            </select>
                            <Briefcase size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                        </div>
                    )}

                    {/* Reset Filters button */}
                    {(deptFilter !== 'ALL' || jobFilter !== 'ALL' || dateRange !== 'MONTH' || searchQuery !== '') && (
                        <button
                            onClick={() => {
                                setDeptFilter('ALL');
                                setJobFilter('ALL');
                                setDateRange('MONTH');
                                setSearchQuery('');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                            <RefreshCw size={12} />
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Staff Category Tabs (Ops / Recruiters) */}
            <div className="flex gap-8 border-b border-surface-200">
                {[
                    { id: 'ops', label: 'Operations Performance Hub', icon: Building2, count: groupedStats.ops.length, activeColor: 'text-blue-600 border-blue-500' },
                    { id: 'recruiter', label: 'Recruitment Command Center', icon: Users, count: groupedStats.recruiters.length, activeColor: 'text-purple-600 border-purple-500' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "pb-4 text-sm font-semibold flex items-center gap-2 transition-all relative duration-200",
                            activeTab === tab.id ? tab.activeColor.split(' ')[0] : "text-surface-400 hover:text-surface-700"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        <span className="text-[10px] font-bold opacity-60 ml-1">({tab.count})</span>
                        {activeTab === tab.id && (
                            <div className={cn("absolute bottom-0 left-0 right-0 h-[3px] rounded-full", activeTab === 'ops' ? 'bg-blue-600' : 'bg-purple-600')} />
                        )}
                    </button>
                ))}
            </div>

            {/* Categorized Staff View */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array(4).fill(0).map((_, i) => (
                        <div key={i} className="bg-white border border-surface-200 h-72 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : (groupedStats.ops.length === 0 && groupedStats.recruiters.length === 0) ? (
                <div className="py-20 bg-surface-50 border border-dashed border-surface-200 rounded-2xl text-center">
                    <p className="text-sm font-bold text-surface-400 uppercase tracking-widest">No operational records match the current filters</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {activeTab === 'ops' ? (
                        <div>
                            <SectionHeader
                                title="Operations Hub"
                                count={groupedStats.ops.length}
                                icon={Building2}
                                colorClass="bg-blue-50 text-blue-600 border-blue-100 shadow-blue-50"
                            />
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {groupedStats.ops.map(stat => <StaffCard key={stat.user.id} stat={stat} onClick={() => setSelectedUser(stat)} />)}
                                </div>
                            ) : (
                                <StaffTable stats={groupedStats.ops} onRowClick={setSelectedUser} isOps={true} />
                            )}
                        </div>
                    ) : (
                        <div>
                            <SectionHeader
                                title="Recruitment Command"
                                count={groupedStats.recruiters.length}
                                icon={Users}
                                colorClass="bg-purple-50 text-purple-600 border-purple-100 shadow-purple-50"
                            />
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {groupedStats.recruiters.map(stat => <StaffCard key={stat.user.id} stat={stat} onClick={() => setSelectedUser(stat)} />)}
                                </div>
                            ) : (
                                <StaffTable stats={groupedStats.recruiters} onRowClick={setSelectedUser} isOps={false} />
                            )}
                        </div>
                    )}
                </div>
            )}

            <EmployeeDetailModal
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                modalTab={modalTab}
                setModalTab={setModalTab}
                modalDateFilter={modalDateFilter}
                setModalDateFilter={setModalDateFilter}
                modalCustomDate={modalCustomDate}
                setModalCustomDate={setModalCustomDate}
                modalStatFilter={modalStatFilter}
                setModalStatFilter={setModalStatFilter}
                updateApplicantStatus={updateApplicantStatus}
            />
        </div>
    );
}

