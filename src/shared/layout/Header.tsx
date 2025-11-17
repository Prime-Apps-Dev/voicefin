import React from 'react';
import { User, Transaction } from '../../core/types';
import { useLocalization } from '../../core/context/LocalizationContext';

interface HeaderProps {
    user: User;
    transactions: Transaction[];
}

const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
};

export const Header: React.FC<HeaderProps> = ({ user, transactions }) => {
    const { t } = useLocalization();

    const todayTransactionsCount = transactions.filter(t => {
        const today = new Date();
        const transactionDate = new Date(t.date);
        return transactionDate.toDateString() === today.toDateString();
    }).length;

    const uniqueCategoriesToday = new Set(transactions.filter(t => {
        const today = new Date();
        const transactionDate = new Date(t.date);
        return transactionDate.toDateString() === today.toDateString();
    }).map(t => t.category)).size;
    
    const userAvatar = user.name.charAt(0).toUpperCase();
    const avatarColor = stringToColor(user.name);

    return (
        <header className="px-6 py-8 bg-gradient-to-b from-gray-800 to-gray-900">
             <div className="flex items-center space-x-4 mb-6">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-700"
                  style={{ backgroundColor: avatarColor }}
                >
                    {userAvatar}
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-100">
                        {t('welcomeBack')}
                    </h1>
                    <p className="text-sm text-gray-400">
                        {new Date().toLocaleDateString(undefined, { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                        })}
                    </p>
                </div>
            </div>

            <div className="bg-gradient-to-b from-gray-900 to-gray-800 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div>
                            <div className="text-xs text-gray-400 mb-1">{t('todayOps')}</div>
                            <div className="text-lg font-semibold text-gray-100">{todayTransactionsCount}</div>
                        </div>
                        <div className="w-px h-8 bg-gray-600" />
                        <div>
                            <div className="text-xs text-gray-400 mb-1">{t('categoriesToday')}</div>
                            <div className="text-lg font-semibold text-gray-100">{uniqueCategoriesToday}</div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};