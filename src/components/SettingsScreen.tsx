import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronDown, BookOpen } from 'lucide-react'; 
import { useLocalization } from '../context/LocalizationContext';
import { COMMON_CURRENCIES } from '../constants';

interface SettingsScreenProps {
    defaultCurrency: string;
    onSetDefaultCurrency: (currency: string) => Promise<void>; // Измененная сигнатура для асинхронного сохранения в БД
    onBack: () => void;
    onShowOnboarding: () => void; 
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ defaultCurrency, onSetDefaultCurrency, onBack, onShowOnboarding }) => {
    const { t, language, setLanguage } = useLocalization();
    const [isSaving, setIsSaving] = useState(false); // Состояние для индикатора загрузки

    /**
     * Обработчик изменения валюты.
     * Отвечает за вызов асинхронной функции сохранения (которая обновляет БД)
     * и управление состоянием загрузки.
     */
    const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrency = e.target.value;
        if (newCurrency === defaultCurrency) return;

        setIsSaving(true);
        try {
            // Вызываем функцию, которая должна обновить состояние в App.tsx и сохранить в БД
            await onSetDefaultCurrency(newCurrency);
        } catch (error) {
            console.error("Не удалось сохранить валюту в БД:", error);
            // В реальном приложении здесь было бы toast-уведомление
        } finally {
            setIsSaving(false);
        }
    };

    return (

        <div className="min-h-screen bg-gray-900 flex flex-col pb-24">

            <header className="px-4 pt-4 flex items-center justify-between sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700">
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-xl font-bold text-white">{t('settings')}</h1>
                <div className="w-10 h-10"></div> {/* Spacer */}
            </header>

            <main className="flex-grow px-4 space-y-6 py-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50"
                >
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="defaultCurrency" className="block text-base font-medium text-gray-300 mb-2">{t('defaultCurrency')}</label>
                            <div className="relative">
                                <select 
                                    id="defaultCurrency" 
                                    value={defaultCurrency} 
                                    onChange={handleCurrencyChange} 
                                    disabled={isSaving} // Отключаем, пока идет сохранение
                                    className="appearance-none w-full bg-gray-700 border-gray-600 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-60 transition-opacity"
                                >
                                    <option value="DEFAULT">{t('accountCurrencyDefault')}</option>
                                    {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {isSaving ? (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                                        {/* Простая анимация загрузки */}
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                ) : (
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none" />
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-base font-medium text-gray-300 mb-2">{t('language')}</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setLanguage('en')} className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${language === 'en' ? 'bg-brand-green text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>English</button>
                                <button onClick={() => setLanguage('ru')} className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${language === 'ru' ? 'bg-brand-green text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Русский</button>
                            </div>
                        </div>

                        {/* --- НОВЫЙ БЛОК ДЛЯ ОБУЧЕНИЯ --- */}
                        <div>
                            <label className="block text-base font-medium text-gray-300 mb-2">{t('tutorial')}</label>
                            <button
                                onClick={onShowOnboarding}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600"
                            >
                                <BookOpen className="w-4 h-4" />
                                {t('showTutorial')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};