import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pin } from 'lucide-react';
import { ForumPost } from '@/services/forumsService';
import { cn } from '@/utils/formatters';

interface PinnedPanelProps {
    isOpen: boolean;
    posts: ForumPost[];
    pinnedPostIds: string[];
    onTogglePin: (postId: string) => void;
    onSelectPost: (post: ForumPost) => void;
    onClose: () => void;
}

function formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function PinnedPanel({ isOpen, posts, pinnedPostIds, onTogglePin, onSelectPost, onClose }: PinnedPanelProps) {
    const pinnedPosts = posts.filter(p => pinnedPostIds.includes(p.id));

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-transparent z-[50] cursor-pointer"
                    />
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, y: -20, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                        className="absolute right-0 top-full mt-2 w-[360px] bg-white border border-[#edebe9] text-[#323130] shadow-2xl z-[60] flex flex-col rounded-lg max-h-[500px] overflow-hidden"
                        style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}
                    >
                        {/* Header */}
                        <div className="flex-none px-5 py-4 border-b border-[#edebe9] flex items-center justify-between bg-white shadow-sm z-10">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-1 h-5 bg-[#0f6cbd] rounded-full shrink-0" />
                                <h2 className="text-[15px] font-semibold text-[#323130] tracking-tight flex items-center gap-1.5">
                                    <Pin size={15} className="text-[#0f6cbd] fill-current" />
                                    <span>Pinned Posts</span>
                                    {pinnedPosts.length > 0 && (
                                        <span className="bg-[#0f6cbd] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full select-none ml-1">
                                            {pinnedPosts.length}
                                        </span>
                                    )}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded hover:bg-[#f3f2f1] text-[#605e5c] hover:text-[#323130] transition-colors"
                            >
                                <X size={15} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Scrollable list */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 bg-[#faf9f8] space-y-2.5">
                            {pinnedPosts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                                    <div className="w-14 h-14 rounded-full bg-[#f3f2f1] flex items-center justify-center border border-[#edebe9] mb-3 text-[#605e5c]">
                                        <Pin size={22} />
                                    </div>
                                    <h3 className="font-semibold text-[#323130] text-sm mb-1">No pinned posts</h3>
                                    <p className="text-xs text-[#605e5c] max-w-[220px] leading-relaxed">
                                        Pin important posts to keep them easily accessible here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pinnedPosts.map((post) => (
                                        <div
                                            key={post.id}
                                            onClick={() => onSelectPost(post)}
                                            className="border border-[#edebe9] rounded-[6px] p-3.5 bg-white shadow-sm hover:border-[#d2d0ce] hover:bg-[#f3f2f1]/30 transition-all duration-150 relative cursor-pointer group"
                                        >
                                            <div className="flex gap-2.5 items-start">
                                                {post.author?.avatar_data ? (
                                                    <img src={post.author.avatar_data} alt={post.author.full_name} className="w-7 h-7 rounded-full object-cover border border-[#edebe9]" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-[#0f6cbd] flex items-center justify-center text-white text-[10px] font-semibold">
                                                        {post.author?.full_name?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="font-semibold text-xs text-[#323130] truncate">
                                                            {post.author?.full_name || 'Unknown'}
                                                        </span>
                                                        <span className="text-[10px] text-[#605e5c] font-normal shrink-0">
                                                            {formatRelativeTime(post.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[#323130] mt-1 font-normal leading-relaxed line-clamp-3">
                                                        {post.content}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end mt-2 pt-2 border-t border-[#f3f2f1]">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTogglePin(post.id);
                                                    }}
                                                    className="p-1 rounded text-[#a80000] hover:bg-[#fde7e9] transition-colors flex items-center gap-1 text-[10px] font-semibold"
                                                    title="Unpin Post"
                                                >
                                                    <Pin size={11} className="fill-current" />
                                                    <span>Unpin</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
