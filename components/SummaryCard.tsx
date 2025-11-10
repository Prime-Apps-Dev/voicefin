import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
    title: string;
    subtitle: string;
    amount: string;
    icon: LucideIcon;
    gradient: string;
    onClick: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, subtitle, amount, icon: Icon, gradient, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`relative overflow-hidden ${gradient} rounded-3xl p-6 text-white text-left w-full h-full transform transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50`}
        >
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Icon className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium opacity-90">{title}</div>
                            <div className="text-xs opacity-70">{subtitle}</div>
                        </div>
                    </div>
                </div>
                <div className="text-2xl font-bold mt-2">
                    {amount}
                </div>
            </div>
        </button>
    );
};
