import React, { useEffect, useState } from 'react';
import { forumsService, ForumPost } from '@/services/forumsService';
import { CreatePostCard } from './components/CreatePostCard';
import { PostFeed } from './components/PostFeed';
import { ThreadPanel } from './components/ThreadPanel';
import { MembersPanel } from './components/MembersPanel';
import { NotificationsPanel } from './components/NotificationsPanel';
import { PinnedPanel } from './components/PinnedPanel';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';
import { Bell, Pin, Users, MessagesSquare } from 'lucide-react';
import { cn } from '@/utils/formatters';

export function ForumsView() {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeThreadPost, setActiveThreadPost] = useState<ForumPost | null>(null);
    const [isGlobalThreadsOpen, setIsGlobalThreadsOpen] = useState(false);
    const [isMembersOpen, setIsMembersOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [pinnedPostIds, setPinnedPostIds] = useState<string[]>([]);
    const [isPinnedOpen, setIsPinnedOpen] = useState(false);
    const { user } = useAuthStore();
    const { unreadCount, loadNotifications } = useNotificationStore();
    const { activeAccount } = useActiveAccountStore();

    const accounts = parseAccounts(user?.department);
    const hasMultipleAccounts = accounts.length > 1;
    const currentAccount = activeAccount || accounts[0] || '';

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const data = await forumsService.getPosts();
            setPosts(data);
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
        
        // Load pinned posts from localStorage
        const stored = localStorage.getItem('forums_pinned_posts');
        if (stored) {
            try {
                setPinnedPostIds(JSON.parse(stored));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    useEffect(() => {
        if (user?.id) {
            loadNotifications(user.id);
        }
    }, [user?.id, loadNotifications]);

    const handlePostCreated = (newPost: ForumPost) => {
        setPosts(prev => [newPost, ...prev]);
        fetchPosts();
    };

    const handleOpenThread = (post: ForumPost) => {
        setActiveThreadPost(post);
        setIsMembersOpen(false);
        setIsNotificationsOpen(false);
    };

    const handleTogglePin = (postId: string) => {
        setPinnedPostIds(prev => {
            const next = prev.includes(postId)
                ? prev.filter(id => id !== postId)
                : [...prev, postId];
            localStorage.setItem('forums_pinned_posts', JSON.stringify(next));
            return next;
        });
    };

    // Restrict by department and role for all users
    const displayedPosts = posts.filter(p => {
        if (user) {
            const userDepts = (user.department || '').split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
            const isOverseer = user.role === 'admin' || user.role === 'super_admin' || userDepts.includes('OVERSEER');
            if (isOverseer) {
                return true;
            }

            const authorRole = (p.author as any)?.role || '';
            const isOpsValView = ['ops_validator', 'guest_interviewer'].includes(user.role);
            if (isOpsValView) {
                if (authorRole.startsWith('recruiter_') && authorRole !== 'admin') {
                    return false;
                }
            } else if (user.role.startsWith('recruiter_') && user.role !== 'admin') {
                if (['ops_validator', 'guest_interviewer'].includes(authorRole)) {
                    return false;
                }
            }

            const postDeptStr = p.department || (p.author as any)?.department || '';
            if (postDeptStr) {
                const postDepts = postDeptStr.split(',').map((d: string) => d.trim().toUpperCase()).filter(Boolean);
                return postDepts.some((d: string) => userDepts.includes(d));
            }
            return true; // Global/no-department posts
        }
        return true;
    });

    return (
        <div className="flex flex-col h-full bg-[#faf9f8] overflow-hidden w-full" style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}>
            {/* Microsoft Fluent Design Header */}
            <div className="flex-none px-6 py-3.5 flex items-center justify-between border-b border-[#edebe9] bg-white select-none shadow-sm z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1 h-6 bg-[#0f6cbd] rounded-full shrink-0" />
                    <h1 className="text-[17px] font-semibold text-[#323130] tracking-tight">
                        Forums
                    </h1>
                    <span className="text-[#edebe9] font-light text-sm">|</span>
                    <p className="text-xs font-normal text-[#605e5c] truncate">
                        Connect, collaborate, and share with the team
                    </p>
                </div>

                <div className="flex items-center gap-0.5">
                    <div className="relative">
                        <button 
                            onClick={() => {
                                setIsNotificationsOpen(!isNotificationsOpen);
                                setIsMembersOpen(false);
                                setIsGlobalThreadsOpen(false);
                                setActiveThreadPost(null);
                            }}
                            className={cn(
                                "p-2 rounded transition-colors flex items-center justify-center relative",
                                isNotificationsOpen 
                                    ? "bg-[#edf6fd] text-[#0f6cbd]" 
                                    : "text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"
                            )}
                            title="Notifications"
                        >
                            <Bell size={16} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#a80000] rounded-full" />
                            )}
                        </button>
                        <NotificationsPanel
                            isOpen={isNotificationsOpen}
                            onClose={() => setIsNotificationsOpen(false)}
                        />
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => {
                                setIsPinnedOpen(!isPinnedOpen);
                                setIsNotificationsOpen(false);
                                setIsMembersOpen(false);
                                setIsGlobalThreadsOpen(false);
                                setActiveThreadPost(null);
                            }}
                            className={cn(
                                "p-2 rounded transition-colors flex items-center justify-center",
                                isPinnedOpen 
                                    ? "bg-[#edf6fd] text-[#0f6cbd]" 
                                    : "text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"
                            )} 
                            title="Pinned Posts"
                        >
                            <Pin size={16} className={cn(isPinnedOpen && "fill-current")} />
                        </button>
                        <PinnedPanel
                            isOpen={isPinnedOpen}
                            posts={posts}
                            pinnedPostIds={pinnedPostIds}
                            onTogglePin={handleTogglePin}
                            onSelectPost={(post) => {
                                handleOpenThread(post);
                                setIsPinnedOpen(false);
                            }}
                            onClose={() => setIsPinnedOpen(false)}
                        />
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => {
                                if (activeThreadPost) {
                                    setActiveThreadPost(null);
                                    setIsGlobalThreadsOpen(false);
                                } else {
                                    setIsGlobalThreadsOpen(!isGlobalThreadsOpen);
                                }
                                setIsMembersOpen(false);
                                setIsNotificationsOpen(false);
                                setIsPinnedOpen(false);
                            }}
                            className={cn(
                                "p-2 rounded transition-colors flex items-center justify-center",
                                isGlobalThreadsOpen || activeThreadPost !== null
                                    ? "bg-[#edf6fd] text-[#0f6cbd]" 
                                    : "text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"
                            )}
                            title="Threads"
                        >
                            <MessagesSquare size={16} />
                        </button>
                        <ThreadPanel
                            isOpen={isGlobalThreadsOpen || activeThreadPost !== null}
                            post={activeThreadPost}
                            allPosts={posts}
                            onSelectPost={(p) => {
                                setActiveThreadPost(p);
                                setIsGlobalThreadsOpen(false);
                            }}
                            onClose={() => {
                                setActiveThreadPost(null);
                                setIsGlobalThreadsOpen(false);
                            }}
                            onThreadUpdated={fetchPosts}
                        />
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => {
                                setIsMembersOpen(!isMembersOpen);
                                setIsGlobalThreadsOpen(false);
                                setActiveThreadPost(null);
                                setIsNotificationsOpen(false);
                                setIsPinnedOpen(false);
                            }}
                            className={cn(
                                "p-2 rounded transition-colors flex items-center justify-center",
                                isMembersOpen 
                                    ? "bg-[#edf6fd] text-[#0f6cbd]" 
                                    : "text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"
                            )}
                            title="Member List"
                        >
                            <Users size={16} />
                        </button>
                        <MembersPanel
                            isOpen={isMembersOpen}
                            onClose={() => setIsMembersOpen(false)}
                        />
                    </div>
                </div>
            </div>

            {/* Scrollable Feed Area */}
            <div className="flex-1 overflow-y-auto scroll-smooth bg-[#faf9f8] px-4 md:px-8 py-6">
                <div className="max-w-[660px] mx-auto">
                    {user && (
                        <div className="mb-4 bg-white rounded-[6px] border border-[#edebe9] p-4 shadow-sm">
                            <CreatePostCard
                                currentUser={user}
                                onPostCreated={handlePostCreated}
                                activeAccount={currentAccount}
                            />
                        </div>
                    )}

                    {loading && posts.length === 0 ? (
                        <div className="px-4 py-20 text-center space-y-4">
                            <div className="w-8 h-8 border-2 border-zinc-200 border-t-[#0f6cbd] rounded-full animate-spin mx-auto" />
                            <p className="text-xs text-[#605e5c] font-semibold tracking-wider">Loading feed...</p>
                        </div>
                    ) : (
                        <PostFeed
                            posts={displayedPosts}
                            onPostUpdated={fetchPosts}
                            onOpenThread={handleOpenThread}
                            pinnedPostIds={pinnedPostIds}
                            onTogglePin={handleTogglePin}
                        />
                    )}
                </div>
            </div>

        </div>
    );
}
