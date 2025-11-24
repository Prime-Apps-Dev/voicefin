import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface SavingsModalProps {
    isOpen: boolean;
    isLoading: boolean;
    tips: string | null;
    onClose: () => void;
}

export const SavingsModal: React.FC<SavingsModalProps> = ({ isOpen, isLoading, tips, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] px-4 py-[56px]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full h-full overflow-hidden flex flex-col border border-zinc-800/60"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-5 border-b border-zinc-800/60 z-10 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-white tracking-tight">Your Personal Savings Tips</h2>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all duration-200"
                                >
                                    <X className="w-4 h-4 text-zinc-400" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto px-6 py-6">
                            {isLoading ? (
                                <div className="flex justify-center items-center py-10">
                                    <div className="w-10 h-10 border-4 border-t-transparent border-brand-green rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div
                                    className="text-zinc-300 whitespace-pre-wrap prose prose-invert prose-sm"
                                    style={{ wordWrap: 'break-word' }}
                                    dangerouslySetInnerHTML={{ __html: (tips || "Could not generate tips at this moment.").replace(/### (.*)/g, '<h3 class="text-white font-semibold text-base mt-3 mb-1">$1</h3>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\* ([^*]+)/g, '<li class="ml-4 mb-1 list-disc">$1</li>') }}
                                />
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 active:scale-95 transition-all duration-200"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};