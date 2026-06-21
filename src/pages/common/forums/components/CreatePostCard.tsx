import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { forumsService, ForumPost } from '@/services/forumsService';
import { useToast } from '@/components/common/useToast';
import { BarChart2, Send, X, Plus, Image } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface CreatePostCardProps {
    currentUser: { id: string; full_name: string; email?: string; avatar_data?: string | null };
    onPostCreated: (post: ForumPost) => void;
    activeAccount?: string;
}

export function CreatePostCard({ currentUser, onPostCreated, activeAccount }: CreatePostCardProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPoll, setShowPoll] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

    const handleAddOption = () => {
        if (pollOptions.length < 5) {
            setPollOptions([...pollOptions, '']);
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const handleRemoveOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
        }
    };

    const handleTriggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() && !showPoll && !imagePreview) return;

        if (showPoll && (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2)) {
            toast.error('Please add a poll question and at least 2 options.');
            return;
        }

        try {
            setIsSubmitting(true);
            const type = showPoll ? 'poll' : 'text';
            const pollData = showPoll ? {
                question: pollQuestion,
                options: pollOptions.filter(o => o.trim())
            } : undefined;

            const newPost = await forumsService.createPost(
                content,
                type,
                pollData,
                undefined,
                imagePreview || undefined,
                activeAccount
            );
            onPostCreated(newPost);

            setContent('');
            setShowPoll(false);
            setPollQuestion('');
            setPollOptions(['', '']);
            setImagePreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            toast.success(showPoll ? 'Poll posted!' : 'Post created!');
        } catch (error: any) {
            console.error('Failed to create post:', error);
            const message = error?.response?.data?.error || 'Failed to create post. Please try again.';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit = content.trim() || imagePreview || (showPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2);

    return (
        <div className="bg-white border border-[#edebe9] rounded-[6px] p-4 mb-4 shadow-sm" style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}>
            <div className="flex gap-4">
                {currentUser.avatar_data ? (
                    <img src={currentUser.avatar_data} alt={currentUser.full_name} className="w-9 h-9 rounded-full object-cover select-none border border-[#edebe9] shadow-sm shrink-0" />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-[#0f6cbd] flex items-center justify-center text-white text-sm font-semibold shrink-0 select-none shadow-sm">
                        {currentUser.full_name.charAt(0)}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <textarea
                        className="w-full bg-transparent resize-none outline-none text-[14px] text-[#323130] placeholder-[#605e5c] leading-relaxed min-h-[52px] max-h-[220px] pt-1"
                        placeholder="What's on your mind?"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={content ? Math.min(Math.ceil(content.length / 70), 5) : 1}
                    />

                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="relative mt-2 mb-3 inline-block max-w-full group">
                            <img
                                src={imagePreview}
                                alt="Attachment preview"
                                className="max-h-60 rounded-md border border-[#edebe9] object-contain shadow-sm"
                            />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute -top-1.5 -right-1.5 p-1 bg-surface-900 text-white rounded-full hover:bg-surface-800 transition-colors shadow-md cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Poll Builder */}
                    <AnimatePresence>
                        {showPoll && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-[#faf9f8] border border-[#edebe9] rounded-[4px] p-4 mb-3 mt-2 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">
                                            <BarChart2 size={14} className="text-[#0f6cbd]" />
                                            <span>Create Poll</span>
                                        </div>
                                        <button
                                            onClick={() => setShowPoll(false)}
                                            className="p-1 rounded hover:bg-[#f3f2f1] text-[#605e5c] transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Ask a question..."
                                        className="w-full bg-white border border-[#edebe9] rounded-[4px] px-3.5 py-2 text-sm outline-none focus:border-[#0f6cbd] transition-all"
                                        value={pollQuestion}
                                        onChange={(e) => setPollQuestion(e.target.value)}
                                    />
                                    <div className="space-y-2">
                                        {pollOptions.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder={`Option ${i + 1}`}
                                                    className="flex-1 bg-white border border-[#edebe9] rounded-[4px] px-3.5 py-1.5 text-sm outline-none focus:border-[#0f6cbd] transition-all"
                                                    value={opt}
                                                    onChange={(e) => handleOptionChange(i, e.target.value)}
                                                />
                                                {pollOptions.length > 2 && (
                                                    <button
                                                        onClick={() => handleRemoveOption(i)}
                                                        className="p-1.5 rounded text-[#605e5c] hover:text-red-600 hover:bg-[#f3f2f1] transition-colors"
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {pollOptions.length < 5 && (
                                        <button
                                            onClick={handleAddOption}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-[#0f6cbd] hover:text-[#0e5c9f] transition-colors uppercase tracking-wider pl-1 pt-1"
                                        >
                                            <Plus size={14} />
                                            <span>Add Option</span>
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#edebe9] mt-2">
                        <div className="flex gap-1 items-center">
                            <button
                                type="button"
                                onClick={() => setShowPoll(!showPoll)}
                                className={cn(
                                    "p-1.5 rounded transition-all duration-150 border",
                                    showPoll 
                                        ? "text-[#0f6cbd] bg-[#edf6fd] border-[#d2e7f7]" 
                                        : "text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1] border-transparent"
                                )}
                                title="Add Poll"
                            >
                                <BarChart2 size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={handleTriggerFileInput}
                                className={cn(
                                    "p-1.5 rounded transition-all duration-150 border text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1] border-transparent cursor-pointer"
                                )}
                                title="Attach Image"
                            >
                                <Image size={16} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !canSubmit}
                            className="bg-[#0f6cbd] hover:bg-[#0e5c9f] disabled:opacity-35 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-[4px] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                            {isSubmitting ? (
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Post</span>
                                    <Send size={11} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
