import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, Users, Send, Search, MessagesSquare } from 'lucide-react';
import { forumsService, ForumPost, ForumThread } from '@/services/forumsService';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/formatters';

interface ThreadPanelProps {
    isOpen: boolean;
    post: ForumPost | null;
    allPosts?: ForumPost[];
    onSelectPost?: (post: ForumPost) => void;
    onClose: () => void;
    onThreadUpdated?: () => void;
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

interface ThreadMessageItemProps {
    message: ForumPost;
    isParent?: boolean;
}

function ThreadMessageItem({ message, isParent = false }: ThreadMessageItemProps) {
    const authorName = message.author?.full_name || 'Unknown';
    const avatar = message.author?.avatar_data;

    return (
        <div className="flex gap-4 relative group hover:bg-surface-50/40 px-3 py-3 rounded-2xl transition-all duration-200">
            {/* Connector Line for Parent Post */}
            {isParent && (
                <div className="absolute top-14 bottom-0 left-[31px] w-[2px] bg-surface-200 mt-1 rounded-full opacity-60" />
            )}

            <div className="flex flex-col items-center shrink-0">
                {avatar ? (
                    <img src={avatar} alt={authorName} className="w-10 h-10 rounded-full object-cover shadow-sm border border-surface-200" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-white text-sm font-black shadow-md">
                        {authorName.charAt(0)}
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                    <span className="font-extrabold text-surface-900 text-[14px] hover:underline cursor-pointer">{authorName}</span>
                    <span className="text-surface-450 text-[11px] font-medium">
                        {formatRelativeTime(message.created_at)}
                    </span>
                </div>
                <p className="text-[14px] text-surface-800 whitespace-pre-wrap leading-relaxed mt-1 tracking-wide font-normal">
                    {message.content}
                </p>
                {message.image_data && (
                    <div className="mt-2 overflow-hidden rounded-md border border-surface-200 max-w-full inline-block">
                        <img
                            src={message.image_data}
                            alt="Post attachment"
                            className="max-h-60 object-contain rounded-md select-none"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export function ThreadPanel({ isOpen, post, allPosts = [], onSelectPost, onClose, onThreadUpdated }: ThreadPanelProps) {
    const { user } = useAuthStore();
    const [thread, setThread] = useState<ForumThread | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!post) {
            setThread(null);
            return;
        }

        const load = async () => {
            try {
                setLoading(true);
                const data = await forumsService.getThread(post.id);
                setThread(data);
            } catch (e) {
                console.error('Failed to load thread:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [post?.id]);

    useEffect(() => {
        if (thread?.messages.length) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [thread?.messages.length]);

    const handleSend = async () => {
        if (!message.trim() || !post) return;
        try {
            setIsSubmitting(true);
            await forumsService.createPost(message, 'text', undefined, post.id);
            setMessage('');
            const data = await forumsService.getThread(post.id);
            setThread(data);
            onThreadUpdated?.();
        } catch (e) {
            console.error('Failed to send thread message:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter posts that have replies (comments) or are threads
    const activeThreads = allPosts.filter(p => {
        const hasComments = p.comments && p.comments.length > 0;
        if (!hasComments) return false;
        if (!searchQuery) return true;
        return p.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
               (p.author?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    });

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
                        className="absolute right-0 top-full mt-2 w-[420px] bg-white border border-[#edebe9] text-[#323130] shadow-2xl z-[60] flex flex-col rounded-lg max-h-[560px] overflow-hidden"
                        style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}
                    >
                        {post ? (
                            // SPECIFIC THREAD VIEW (Microsoft style thread discussion)
                            <>
                                {/* Header */}
                                <div className="flex-none px-6 py-4 border-b border-[#edebe9] flex items-center justify-between bg-white shadow-sm z-10">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-1 h-5 bg-[#0f6cbd] rounded-full shrink-0" />
                                        <h2 className="text-[15px] font-semibold text-[#323130] tracking-tight truncate">
                                            {post.content.length > 35 ? post.content.substring(0, 35) + '...' : post.content}
                                        </h2>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 rounded hover:bg-[#f3f2f1] text-[#605e5c] hover:text-[#323130] transition-colors"
                                    >
                                        <X size={15} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Scrollable content */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#faf9f8]">
                                    {loading && !thread ? (
                                        <div className="px-5 py-16 text-center space-y-4">
                                            <div className="w-7 h-7 border-2 border-zinc-200 border-t-[#0f6cbd] rounded-full animate-spin mx-auto" />
                                            <p className="text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Loading thread...</p>
                                        </div>
                                    ) : thread ? (
                                        <div className="space-y-4">
                                            {/* Parent Post */}
                                            <div className="bg-white border border-[#edebe9] rounded-[6px] p-3.5 shadow-sm text-[#323130]">
                                                <ThreadMessageItem message={thread.parent} isParent={true} />
                                            </div>

                                            {/* Participants Stats Banner */}
                                            {thread.messages.length > 0 && (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-[#edf6fd] border border-[#d2e7f7] rounded-[4px] mx-1 select-none">
                                                    <Users size={14} className="text-[#0f6cbd]" strokeWidth={2.5} />
                                                    <span className="text-[11px] text-[#0f6cbd] font-semibold uppercase tracking-wider">
                                                        {thread.messages.length} repl{thread.messages.length !== 1 ? 'ies' : 'y'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Thread replies list */}
                                            {thread.messages.length === 0 ? (
                                                <div className="py-16 text-center rounded-[6px] bg-white border border-dashed border-[#edebe9] p-6">
                                                    <p className="text-sm text-[#605e5c] font-semibold">No replies yet. Be the first to start the thread!</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2.5 bg-white border border-[#edebe9] rounded-[6px] p-3.5 shadow-sm text-[#323130]">
                                                    {thread.messages.map((msg, idx) => (
                                                        <div key={msg.id} className="relative group/reply">
                                                            {/* Nested reply connector line */}
                                                            {idx < thread.messages.length - 1 && (
                                                                <div className="absolute top-12 bottom-0 left-[31px] w-[2px] bg-[#edebe9] opacity-40 rounded-full" />
                                                            )}
                                                            <ThreadMessageItem message={msg} />
                                                        </div>
                                                    ))}
                                                    <div ref={messagesEndRef} />
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>

                                {/* Reply input composer */}
                                <div className="flex-none border-t border-[#edebe9] p-4 bg-white shadow-premium">
                                    <div className="flex items-center gap-3">
                                        {user?.avatar_data ? (
                                            <img src={user.avatar_data} alt={user.full_name} className="w-8 h-8 rounded-full object-cover border border-[#edebe9] shadow-sm shrink-0" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-[#0f6cbd] flex items-center justify-center text-white font-semibold text-[11px] shrink-0 shadow-sm">
                                                {user?.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div className="flex-1 relative flex items-center">
                                            <input
                                                type="text"
                                                placeholder={thread?.parent ? `Reply to thread...` : 'Message...'}
                                                className="w-full bg-[#f3f2f1] border border-[#edebe9] rounded-[4px] pl-4 pr-12 py-2 text-sm text-[#323130] outline-none focus:border-[#0f6cbd] transition-all placeholder-[#605e5c]"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                                autoFocus
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleSend}
                                                disabled={isSubmitting || !message.trim()}
                                                className="absolute right-2 p-1.5 text-[#0f6cbd] hover:text-[#0e5c9f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <Send size={15} />
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // GLOBAL THREADS LIST VIEW (Microsoft Design)
                            <>
                                {/* Header */}
                                <div className="flex-none px-6 py-4 border-b border-[#edebe9] flex items-center justify-between bg-white shadow-sm z-10">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-1 h-5 bg-[#0f6cbd] rounded-full shrink-0" />
                                        <h2 className="text-[15px] font-semibold text-[#323130] tracking-tight">
                                            Threads
                                        </h2>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 rounded hover:bg-[#f3f2f1] text-[#605e5c] hover:text-[#323130] transition-colors"
                                    >
                                        <X size={15} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Search Bar */}
                                <div className="px-4 py-3 bg-[#f3f2f1] border-b border-[#edebe9] flex items-center gap-2.5">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            placeholder="Search for Thread Name"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-white text-sm text-[#323130] placeholder-[#605e5c] pl-9 pr-4 py-1.5 rounded-[4px] outline-none border border-[#edebe9] focus:border-[#0f6cbd] transition-all"
                                        />
                                        <Search size={14} className="text-[#605e5c] absolute left-3 top-1/2 -translate-y-1/2" />
                                    </div>
                                    <button className="px-3 py-1.5 bg-[#0f6cbd] hover:bg-[#0e5c9f] text-white text-xs font-semibold rounded-[4px] transition-colors shadow-sm shrink-0">
                                        Create
                                    </button>
                                </div>

                                {/* Scrollable content (List of active threads) */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#faf9f8]">
                                    {activeThreads.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                                            <div className="w-16 h-16 rounded-full bg-[#f3f2f1] flex items-center justify-center border border-[#edebe9] mb-4 shadow-sm text-zinc-450 relative">
                                                <MessagesSquare size={28} className="text-[#605e5c]" />
                                            </div>
                                            <h3 className="font-semibold text-[#323130] text-[15px] mb-2 tracking-tight">There are no threads.</h3>
                                            <p className="text-xs text-[#605e5c] max-w-[280px] leading-relaxed">
                                                Stay focused on a conversation with a thread.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {activeThreads.map((threadPost) => {
                                                const commentCount = threadPost.comments?.length || 0;
                                                return (
                                                    <button
                                                        key={threadPost.id}
                                                        onClick={() => onSelectPost?.(threadPost)}
                                                        className="w-full text-left bg-white hover:bg-[#f3f2f1] border border-[#edebe9] hover:border-[#d2d0ce] p-4 rounded-[6px] flex gap-4 transition-all duration-150 shadow-sm group"
                                                    >
                                                        {threadPost.author?.avatar_data ? (
                                                            <img src={threadPost.author.avatar_data} alt={threadPost.author.full_name} className="w-9 h-9 rounded-full object-cover border border-[#edebe9] shadow-sm shrink-0" />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-full bg-[#0f6cbd] flex items-center justify-center text-white text-xs font-semibold shadow-sm shrink-0">
                                                                {threadPost.author?.full_name?.charAt(0) || '?'}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-semibold text-[#323130] text-xs truncate group-hover:text-[#0f6cbd] transition-colors">
                                                                    {threadPost.author?.full_name || 'Unknown'}
                                                                </span>
                                                                <span className="text-[10px] text-[#605e5c] font-normal">
                                                                    {formatRelativeTime(threadPost.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className="text-[#605e5c] text-xs font-normal mt-1 leading-snug line-clamp-2 pr-2">
                                                                {threadPost.content}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-[#0f6cbd] font-bold uppercase tracking-wider">
                                                                <MessagesSquare size={12} strokeWidth={2.5} />
                                                                <span>{commentCount} repl{commentCount !== 1 ? 'ies' : 'y'}</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
