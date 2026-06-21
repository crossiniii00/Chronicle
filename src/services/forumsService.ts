import { apiClient as api } from '@/utils/apiClient';

export interface ForumUser {
    id: string;
    full_name: string;
    email?: string;
    avatar_data?: string | null;
}

export interface ForumComment {
    id: string;
    content: string;
    created_at: string;
    author: ForumUser;
}

export interface ForumReaction {
    id: string;
    reaction_type: string;
    user_id: string;
    user_name: string;
}

export interface ForumPollOption {
    id: string;
    option_text: string;
    votes: { user_id: string }[] | null;
}

export interface ForumPoll {
    id: string;
    question: string;
    options: ForumPollOption[];
}

export interface ForumThreadParticipant {
    id: string;
    full_name: string;
    avatar_data?: string | null;
}

export interface ForumPost {
    id: string;
    content: string;
    type: 'text' | 'poll';
    created_at: string;
    author: ForumUser;
    comments: ForumComment[] | null;
    reactions: ForumReaction[] | null;
    poll: ForumPoll | null;
    parent_id?: string | null;
    thread_count?: number;
    thread_participants?: ForumThreadParticipant[] | null;
    image_data?: string | null;
    department?: string | null;
}

export interface ForumThread {
    parent: ForumPost;
    messages: ForumPost[];
}

export const forumsService = {
    getPosts: async (): Promise<ForumPost[]> => {
        const response = await api.get('/forums/posts');
        return response.data;
    },

    getMyPostsCount: async (): Promise<number> => {
        const response = await api.get('/forums/posts/count');
        return response.data.count;
    },

    getThread: async (postId: string): Promise<ForumThread> => {
        const response = await api.get(`/forums/posts/${postId}/thread`);
        return response.data;
    },

    createPost: async (
        content: string,
        type: 'text' | 'poll' = 'text',
        poll?: { question: string, options: string[] },
        parent_id?: string,
        image_data?: string,
        department?: string
    ) => {
        const response = await api.post('/forums/posts', { content, type, poll, parent_id, image_data, department });
        return response.data;
    },

    deletePost: async (postId: string) => {
        const response = await api.delete(`/forums/posts/${postId}`);
        return response.data;
    },

    createComment: async (postId: string, content: string): Promise<ForumComment> => {
        const response = await api.post(`/forums/posts/${postId}/comments`, { content });
        return response.data;
    },

    react: async (postId: string | null, commentId: string | null, reactionType: string) => {
        const response = await api.post('/forums/react', {
            post_id: postId,
            comment_id: commentId,
            reaction_type: reactionType
        });
        return response.data;
    },

    voteOnPoll: async (optionId: string) => {
        const response = await api.post(`/forums/polls/${optionId}/vote`);
        return response.data;
    }
};
