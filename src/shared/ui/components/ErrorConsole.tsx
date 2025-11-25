import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Copy, AlertTriangle } from 'lucide-react';

interface ErrorConsoleProps {
    errors: string[];
    onClear: () => void;
}

export const ErrorConsole: React.FC<ErrorConsoleProps> = ({ errors, onClear }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!errors || errors.length === 0) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-[9999] flex flex-col items-center">
            <div className={`bg-red-900/90 backdrop-blur-md border border-red-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96' : 'max-h-14'}`}>

                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-red-800/50 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2 text-red-200">
                        <AlertTriangle size={18} className="text-red-400" />
                        <span className="font-bold text-sm">
                            {errors.length} Error{errors.length > 1 ? 's' : ''} Detected
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={18} className="text-red-300" /> : <ChevronUp size={18} className="text-red-300" />}
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-4 overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-red-700 scrollbar-track-transparent">
                    <div className="space-y-2 mt-2">
                        {errors.map((err, index) => (
                            <div key={index} className="bg-black/40 p-3 rounded-lg border border-red-800/50 text-xs font-mono text-red-100 break-words relative group">
                                {err}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(err);
                                    }}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                                    title="Copy error"
                                >
                                    <Copy size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear();
                            }}
                            className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1"
                        >
                            <X size={14} /> Clear Log
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
