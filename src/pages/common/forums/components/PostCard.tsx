import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { forumsService, ForumPost } from '@/services/forumsService';
import { useAuthStore } from '@/store/authStore';
import { MessageCircle, Heart, Send, BarChart2, Sparkles, MessagesSquare, CornerDownRight, Pin, Trash2 } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface PostCardProps {
    post: ForumPost;
    onUpdate: () => void;
    onOpenThread: (post: ForumPost) => void;
    isPinned: boolean;
    onTogglePin: () => void;
}

const REACTIONS = [
    { type: 'like', icon: '👍', label: 'Like' },
    { type: 'heart', icon: '❤️', label: 'Love' },
    { type: 'celebrate', icon: '🎉', label: 'Celebrate' },
    { type: 'laugh', icon: '😂', label: 'Haha' },
    { type: 'wow', icon: '😮', label: 'Wow' },
    { type: 'sad', icon: '😢', label: 'Sad' },
    { type: 'angry', icon: '😡', label: 'Angry' },
    { type: 'fire', icon: '🔥', label: 'Fire' },
    { type: 'clap', icon: '👏', label: 'Clap' },
    { type: 'rocket', icon: '🚀', label: 'Rocket' },
    { type: 'eyes', icon: '👀', label: 'Eyes' },
    { type: 'hundred', icon: '💯', label: '100' }
];

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

export function PostCard({ post, onUpdate, onOpenThread, isPinned, onTogglePin }: PostCardProps) {
    const { user } = useAuthStore();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const currentUserReaction = post.reactions?.find(r => r.user_id === user?.id);
    const totalReactions = post.reactions?.length || 0;
    const totalComments = post.comments?.length || 0;

    const handleReact = async (reactionType: string) => {
        if (!user) return;
        try {
            await forumsService.react(post.id, null, reactionType);
            onUpdate();
        } catch (e) {
            console.error('Failed to react:', e);
        }
        setShowReactions(false);
    };

    const handleComment = async () => {
        if (!commentText.trim() || !user) return;
        try {
            setIsSubmittingComment(true);
            await forumsService.createComment(post.id, commentText);
            setCommentText('');
            onUpdate();
        } catch (e) {
            console.error('Failed to comment:', e);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleVote = async (optionId: string) => {
        if (!user) return;
        try {
            await forumsService.voteOnPoll(optionId);
            onUpdate();
        } catch (e) {
            console.error('Failed to vote:', e);
        }
    };

    const renderPoll = () => {
        if (!post.poll) return null;

        let totalVotes = 0;
        const optionsWithVotes = post.poll.options.map(opt => {
            const count = opt.votes ? opt.votes.length : 0;
            totalVotes += count;
            const hasVoted = opt.votes?.some(v => v.user_id === user?.id);
            return { ...opt, count, hasVoted };
        });

        return (
            <div className="mt-3 border border-[#edebe9] rounded-[6px] p-4 bg-[#faf9f8]">
                <div className="flex items-center gap-2 mb-3">
                    <BarChart2 size={15} className="text-[#605e5c]" />
                    <h4 className="font-semibold text-[#323130] text-[14px]">{post.poll.question}</h4>
                </div>
                <div className="space-y-2">
                    {optionsWithVotes.map(opt => {
                        const percentage = totalVotes === 0 ? 0 : Math.round((opt.count / totalVotes) * 100);
                        return (
                            <button
                                key={opt.id}
                                onClick={() => handleVote(opt.id)}
                                className={cn(
                                    "relative w-full text-left px-4 py-2.5 rounded-[4px] border transition-all overflow-hidden group/opt",
                                    opt.hasVoted
                                        ? "border-[#0f6cbd] bg-[#edf6fd]/30"
                                        : "border-[#edebe9] hover:border-[#d2d0ce] bg-white"
                                )}
                            >
                                <motion.div
                                    initial={false}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className={cn(
                                        "absolute top-0 left-0 bottom-0 rounded-[4px]",
                                        opt.hasVoted ? "bg-[#d2e7f7]/40" : "bg-[#f3f2f1]"
                                    )}
                                />
                                <div className="relative flex justify-between items-center z-10">
                                    <span className={cn(
                                        "font-semibold text-xs",
                                        opt.hasVoted ? "text-[#0f6cbd]" : "text-[#323130]"
                                    )}>
                                        {opt.option_text}
                                    </span>
                                    <span className="text-xs font-semibold text-[#605e5c] tabular-nums">
                                        {percentage}%
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-2.5 text-[10px] text-[#605e5c] font-semibold uppercase tracking-wider">
                    {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · {post.poll.options.length} options
                </div>
            </div>
        );
    };

    const getReactionIcon = (type: string) => {
        const reaction = REACTIONS.find(r => r.type === type);
        return reaction ? reaction.icon : '👍';
    };

    return (
        <div className="group bg-white border border-[#edebe9] rounded-[6px] py-5 px-5 relative transition-all duration-200 hover:shadow-md mb-4" style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}>
            <div className="flex gap-4">
                {/* Avatar Column */}
                <div className="flex flex-col items-center shrink-0 relative">
                    {post.author?.avatar_data ? (
                        <img src={post.author.avatar_data} alt={post.author.full_name} className="w-10 h-10 rounded-full object-cover select-none border border-[#edebe9] shadow-sm" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0f6cbd] flex items-center justify-center text-white text-sm font-semibold shadow-sm select-none">
                            {post.author?.full_name?.charAt(0) || '?'}
                        </div>
                    )}
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                    {/* Header: Name + Pinned Status + Timestamp */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-sm min-w-0">
                            <span className="font-extrabold text-surface-900 text-[15px] hover:underline cursor-pointer">
                                {post.author?.full_name || 'Unknown'}
                            </span>
                            <span className="text-[#a19f9d] text-xs shrink-0 whitespace-nowrap font-medium">
                                {formatRelativeTime(post.created_at)}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePin();
                                }}
                                className={cn(
                                    "p-1 rounded hover:bg-[#f3f2f1] transition-all ml-1.5",
                                    isPinned ? "text-[#0f6cbd]" : "text-[#a19f9d] hover:text-[#605e5c] opacity-0 group-hover:opacity-100"
                                )}
                                title={isPinned ? "Unpin Post" : "Pin Post"}
                            >
                                <Pin size={12} className={cn(isPinned && "fill-current")} />
                            </button>
                            {(user && (post.author?.id === user.id || ['admin', 'super_admin'].includes(user.role))) && (
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm("Are you sure you want to delete this post?")) {
                                            try {
                                                await forumsService.deletePost(post.id);
                                                onUpdate();
                                            } catch (err) {
                                                console.error("Failed to delete post:", err);
                                            }
                                        }
                                    }}
                                    className="p-1 rounded hover:bg-red-50 text-[#a19f9d] hover:text-red-600 transition-all ml-1.5 opacity-0 group-hover:opacity-100 cursor-pointer"
                                    title="Delete Post"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Body text */}
                    <p className="text-[15px] text-surface-800 whitespace-pre-wrap leading-relaxed mt-1.5 font-normal tracking-wide">
                        {post.content}
                    </p>

                    {post.image_data && (
                        <div className="mt-3 overflow-hidden rounded-md border border-[#edebe9] max-w-full inline-block">
                            <img
                                src={post.image_data}
                                alt="Post attachment"
                                className="max-h-96 object-contain rounded-md select-none hover:scale-[1.01] transition-transform duration-200"
                            />
                        </div>
                    )}
                    {post.type === 'poll' && renderPoll()}

                    {/* Action Bar (Minimalist Threads Style) */}
                    <div className="flex items-center gap-4 mt-3">
                        {/* Like button with reaction popup on hover */}
                        <div
                            className="relative"
                            onMouseEnter={() => setShowReactions(true)}
                            onMouseLeave={() => setShowReactions(false)}
                        >
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleReact(currentUserReaction ? currentUserReaction.reaction_type : 'like')}
                                className={cn(
                                    "flex items-center justify-center p-1.5 rounded-full transition-all duration-150 cursor-pointer",
                                    currentUserReaction ? "bg-[#edf6fd] text-[#0f6cbd] scale-110 shadow-sm" : "text-surface-500 hover:text-[#0f6cbd] hover:bg-[#f3f2f1]"
                                )}
                            >
                                {currentUserReaction ? (
                                    <span className="text-base leading-none select-none">
                                        {REACTIONS.find(r => r.type === currentUserReaction.reaction_type)?.icon || '👍'}
                                    </span>
                                ) : (
                                    <Heart size={19} />
                                )}
                            </motion.button>

                            <AnimatePresence>
                                {showReactions && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.85 }}
                                        transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                                        className="absolute bottom-full left-0 pb-3 z-40"
                                    >
                                        <div className="bg-white border border-[#edebe9] rounded-full shadow-2xl px-2 py-1 flex items-center gap-1 backdrop-blur-sm">
                                            {REACTIONS.map(reaction => (
                                                <motion.button
                                                    key={reaction.type}
                                                    whileHover={{ scale: 1.45, y: -7 }}
                                                    whileTap={{ scale: 0.8 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReact(reaction.type);
                                                    }}
                                                    className="w-7 h-7 rounded-full hover:bg-[#f3f2f1] flex items-center justify-center text-[16px] leading-none transition-colors duration-75 cursor-pointer"
                                                    title={reaction.label}
                                                >
                                                    {reaction.icon}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Reply Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowComments(!showComments)}
                            className={cn(
                                "flex items-center justify-center p-1.5 rounded transition-colors cursor-pointer",
                                showComments ? "text-[#0f6cbd] bg-[#edf6fd]" : "text-[#605e5c] hover:text-[#0f6cbd] hover:bg-[#f3f2f1]"
                            )}
                        >
                            <MessageCircle size={19} />
                        </motion.button>
                    </div>

                    {/* Stats & Avatars Footer (Threads Style) */}
                    {(totalReactions > 0 || totalComments > 0) && (
                        <div className="flex items-center gap-2 mt-3 text-xs text-[#605e5c] font-semibold select-none">
                            {post.thread_participants && post.thread_participants.length > 0 && (
                                <div className="flex -space-x-1.5 mr-1 select-none">
                                    {post.thread_participants.slice(0, 3).map((p, i) => (
                                        <div
                                            key={p.id}
                                            className="w-5 h-5 rounded-full bg-[#0f6cbd] flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-white overflow-hidden"
                                            style={{ zIndex: 3 - i }}
                                        >
                                            {p.avatar_data ? (
                                                <img src={p.avatar_data} alt={p.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                p.full_name.charAt(0)
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="hover:underline cursor-pointer flex items-center gap-2 text-[11px] uppercase tracking-wider font-extrabold" onClick={() => setShowComments(!showComments)}>
                                {totalComments > 0 && <span>{totalComments} repl{totalComments !== 1 ? 'ies' : 'y'}</span>}
                                {totalComments > 0 && totalReactions > 0 && <span>·</span>}
                                {totalReactions > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex -space-x-1 items-center">
                                            {Array.from(new Set(post.reactions?.map(r => r.reaction_type))).slice(0, 3).map(type => (
                                                <span key={type} className="text-xs filter drop-shadow-sm select-none" title={type}>
                                                    {REACTIONS.find(r => r.type === type)?.icon}
                                                </span>
                                            ))}
                                        </div>
                                        <span>{totalReactions} reaction{totalReactions !== 1 ? 's' : ''}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Inner Comments list (Threads nested layout) */}
                    <AnimatePresence>
                        {showComments && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 pt-4 border-t border-[#edebe9] space-y-4">
                                    {/* Create Comment Input */}
                                    <div className="flex gap-3 items-center">
                                        {user?.avatar_data ? (
                                            <img src={user.avatar_data} alt={user.full_name} className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0 border border-[#edebe9]" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-[#0f6cbd] flex items-center justify-center text-white font-semibold text-[11px] shrink-0 shadow-sm">
                                                {user?.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div className="flex-1 relative flex items-center">
                                            <input
                                                type="text"
                                                placeholder="Reply to thread..."
                                                className="w-full bg-[#f3f2f1] border border-[#edebe9] rounded-[4px] pl-4 pr-12 py-2 text-sm outline-none focus:border-[#0f6cbd] focus:bg-white transition-all text-[#323130] placeholder-[#605e5c]"
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleComment()}
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleComment}
                                                disabled={isSubmittingComment || !commentText.trim()}
                                                className="absolute right-2 p-1.5 text-[#0f6cbd] hover:text-[#0e5c9f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <Send size={14} />
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Nested Comments/Replies */}
                                    {post.comments && post.comments.length > 0 && (
                                        <div className="space-y-3 pl-2">
                                            {post.comments.map((comment) => (
                                                <div key={comment.id} className="flex gap-3 items-start relative group/comment">
                                                    {/* Nested connector indicator */}
                                                    <div className="absolute -left-3 top-0 bottom-0 w-[2px] bg-[#edebe9] rounded-full opacity-40 group-last/comment:bottom-[80%]" />
                                                    
                                                    {comment.author?.avatar_data ? (
                                                        <img src={comment.author.avatar_data} alt={comment.author.full_name} className="w-7 h-7 rounded-full object-cover shadow-sm shrink-0 border border-[#edebe9]" />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-[#0f6cbd] flex items-center justify-center text-white font-semibold text-[10px] shrink-0">
                                                            {comment.author?.full_name?.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="bg-[#faf9f8] border border-[#edebe9] rounded-[6px] px-3.5 py-1.5 inline-block max-w-full">
                                                            <div className="flex items-baseline gap-1.5 mb-0.5">
                                                                <span className="font-semibold text-[#323130] text-xs hover:underline cursor-pointer">
                                                                    {comment.author?.full_name || 'Unknown'}
                                                                </span>
                                                                <span className="text-[#605e5c] text-[10px] font-medium">
                                                                    {formatRelativeTime(comment.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className="text-[13px] text-[#323130] leading-relaxed font-normal">
                                                                {comment.content}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
