import React from 'react';
import { ForumPost } from '@/services/forumsService';
import { PostCard } from './PostCard';
import { MessageCircle } from 'lucide-react';

interface PostFeedProps {
    posts: ForumPost[];
    onPostUpdated: () => void;
    onOpenThread: (post: ForumPost) => void;
    pinnedPostIds: string[];
    onTogglePin: (postId: string) => void;
}

export function PostFeed({ posts, onPostUpdated, onOpenThread, pinnedPostIds, onTogglePin }: PostFeedProps) {
    if (posts.length === 0) {
        return (
            <div className="px-4 py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle size={24} className="text-[#605e5c]" />
                </div>
                <h3 className="text-base font-semibold text-[#323130]">No posts yet</h3>
                <p className="text-xs text-[#605e5c] mt-1 max-w-xs mx-auto leading-relaxed">
                    Start a conversation — share an update, ask a question, or run a poll.
                </p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-[#edebe9]">
            {posts.map(post => (
                <PostCard
                    key={post.id}
                    post={post}
                    onUpdate={onPostUpdated}
                    onOpenThread={onOpenThread}
                    isPinned={pinnedPostIds.includes(post.id)}
                    onTogglePin={() => onTogglePin(post.id)}
                />
            ))}
        </div>
    );
}
