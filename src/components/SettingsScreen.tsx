import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronDown, BookOpen } from 'lucide-react'; // Добавил иконку для примера, можно использовать любую
import { useLocalization } from '../context/LocalizationContext';
import { COMMON_CURRENCIES } from '../constants';

interface SettingsScreenProps {
    defaultCurrency: string;
    onSetDefaultCurrency: (currency: string) => void;
    onBack: () => void;
    onShowOnboarding: () => void; // Добавлено новое свойство
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ defaultCurrency, onSetDefaultCurrency, onBack, onShowOnboarding }) => {
    const { t, language, setLanguage } = useLocalization();

    return (
        // ДОБАВЛЯЕМ pt-[85px] ЗДЕСЬ
        <div className="min-h-screen bg-gray-900 flex flex-col pb-24 pt-[85px]">
            {/* УБИРАЕМ pt-8 отсюда, чтобы header прилип кверху */}
            <header className="px-4 pb-4 flex items-center justify-between sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
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
                                <select id="defaultCurrency" value={defaultCurrency} onChange={(e) => onSetDefaultCurrency(e.target.value)} className="appearance-none w-full bg-gray-700 border-gray-600 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="DEFAULT">{t('accountCurrencyDefault')}</option>
                                    {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none" />
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