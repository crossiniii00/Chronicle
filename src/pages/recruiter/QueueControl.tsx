import React, { useState } from 'react';
import { RefreshCw, Monitor, Activity, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueueControl } from './queue/hooks/useQueueControl';
import { MonitorPanel, QueueItemCard, EmptyState } from './queue/components/MonitorPanel';
import { StationMatrix, ActivityStream } from './queue/components/StationMatrix';
import { QueueStats, CallPromptModal } from './queue/components/QueueControlUI';
import { QueueSettingsModal } from './queue/components/QueueSettingsModal';
import { cn } from '@/utils/formatters';

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export function QueueControl() {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const {
        activeSessions, callHistory, rooms, loadingRooms,
        refreshKey, recruiterOptions, validatorOptions,
        callPrompt, setCallPrompt, promptData, setPromptData,
        initialWaiting, finalWaiting, loadQueue, loadRooms,
        handleCallNext, confirmCall, handleSkip, handleDelete,
        handleTerminate, handleRemoveActive
    } = useQueueControl();

    return (
        <div key={refreshKey} className="space-y-5 pb-12 animate-fade-in">
            <div className="bg-white border-b border-surface-200">
                <div className="relative px-6 pt-5 pb-4 flex flex-col items-center justify-center border-b border-surface-100">
                    <div className="flex items-center gap-2.5">
                        <Activity size={17} className="text-[#605e5c] self-center" />
                        <h1
                            className="text-[30px] leading-none text-surface-900 tracking-[-0.02em]"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                        >
                            Queue Control
                        </h1>
                    </div>
                    <div className="flex items-center gap-2.5 mt-3">
                        <QueueStats
                            initialCount={initialWaiting.length}
                            finalCount={finalWaiting.length}
                            servedCount={callHistory.length}
                        />
                        <div className="w-px h-5 bg-surface-200" />
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => { loadQueue(); loadRooms(); }}
                            className="flex items-center gap-1.5 px-3 h-7 bg-white border border-surface-200 text-black/70 text-[11.5px] font-medium tracking-[-0.005em] hover:border-black/40 hover:text-black transition-all rounded-sm cursor-pointer"
                        >
                            <RefreshCw size={12} strokeWidth={2} className={cn(loadingRooms && "animate-spin")} /> Sync
                        </motion.button>
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => setSettingsOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-white border border-surface-200 text-black/70 text-[11.5px] font-medium tracking-[-0.005em] hover:border-black/40 hover:text-black transition-all rounded-sm cursor-pointer"
                        >
                            <Settings size={12} strokeWidth={2} /> Settings
                        </motion.button>
                        <motion.a
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            href="/queue-display"
                            target="_blank"
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-black text-white text-[11.5px] font-medium tracking-[-0.005em] hover:bg-black/85 transition-all rounded-sm cursor-pointer"
                        >
                            <Monitor size={12} strokeWidth={2.25} /> Live display
                        </motion.a>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-5 px-6">
                <MonitorPanel
                    title="Initial interview"
                    count={initialWaiting.length}
                    onCallNext={() => handleCallNext('INITIAL')}
                    activeSessions={activeSessions.filter(s => s.queue_type === 'INITIAL')}
                    onTerminate={handleTerminate}
                    onDeleteActive={handleRemoveActive}
                    rooms={rooms}
                    accent="blue"
                >
                    <div className="space-y-2">
                        {initialWaiting.length === 0 ? (
                            <EmptyState message="Ready for candidates" />
                        ) : (
                            initialWaiting.map((entry, i) => (
                                <QueueItemCard
                                    key={entry.id}
                                    entry={entry}
                                    index={i}
                                    onCall={() => handleCallNext('INITIAL')}
                                    onSkip={() => handleSkip(entry.id, entry.applicant_name)}
                                    onDelete={() => handleDelete(entry.id, entry.applicant_name)}
                                />
                            ))
                        )}
                    </div>
                </MonitorPanel>

                <MonitorPanel
                    title="Ops val interview"
                    count={finalWaiting.length}
                    onCallNext={() => handleCallNext('FINAL')}
                    activeSessions={activeSessions.filter(s => s.queue_type === 'FINAL')}
                    onTerminate={handleTerminate}
                    onDeleteActive={handleRemoveActive}
                    rooms={rooms}
                    accent="rose"
                >
                    <div className="space-y-2">
                        {finalWaiting.length === 0 ? (
                            <EmptyState message="Awaiting endorsements" />
                        ) : (
                            finalWaiting.map((entry, i) => (
                                <QueueItemCard
                                    key={entry.id}
                                    entry={entry}
                                    index={i}
                                    onCall={() => handleCallNext('FINAL')}
                                    onSkip={() => handleSkip(entry.id, entry.applicant_name)}
                                    onDelete={() => handleDelete(entry.id, entry.applicant_name)}
                                />
                            ))
                        )}
                    </div>
                </MonitorPanel>
            </div>

            <div className="grid lg:grid-cols-3 gap-5 px-6">
                <StationMatrix rooms={rooms} loadingRooms={loadingRooms} />
                <ActivityStream
                    callHistory={callHistory}
                    activeSessions={activeSessions}
                    handleTerminate={handleTerminate}
                />
            </div>

            <CallPromptModal
                callPrompt={callPrompt}
                setCallPrompt={setCallPrompt}
                confirmCall={confirmCall}
                promptData={promptData}
                setPromptData={setPromptData}
                rooms={rooms}
                recruiterOptions={recruiterOptions}
                validatorOptions={validatorOptions}
            />

            <AnimatePresence>
                {settingsOpen && (
                    <QueueSettingsModal
                        open={settingsOpen}
                        onClose={() => setSettingsOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
