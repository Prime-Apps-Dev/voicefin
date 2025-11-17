import React, { useRef } from 'react';
import { motion } from 'framer-motion'; // Оставили motion для анимации карточек
import { ChevronLeft, Info, CalendarDays } from 'lucide-react';
import { useLocalization } from '../../core/context/LocalizationContext';
import { APP_VERSION, CHANGELOG } from '../../utils/constants'; 

interface AboutScreenProps {
    onBack: () => void;
}

/**
 * Экран "О приложении" с текущей версией и историей изменений.
 */
export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
    const { t } = useLocalization();

    // Логика useScroll, useTransform и headerTitleOpacity удалена, 
    // так как заголовок должен быть статичен и всегда виден.
    const scrollRef = useRef(null);

    return (
        <div ref={scrollRef} className="h-screen overflow-y-auto bg-gray-900 flex flex-col scrollbar-hide">

            {/* Fixed/Sticky Header */}
            <header className="px-4 pt-4 pb-3 flex items-center justify-between sticky top-0 bg-gray-900/80 backdrop-blur-sm z-20 transition-shadow duration-300 shadow-xl shadow-gray-900/50">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700">
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                {/* ИСПРАВЛЕНИЕ: Заголовок теперь всегда видим */}
                <h1 
                    className="text-xl font-bold text-white absolute inset-x-0 text-center pointer-events-none"
                    style={{ opacity: 1 }} // Фиксированная непрозрачность
                >
                    {t('aboutApp')}
                </h1>
                <div className="w-10 h-10"></div> {/* Пустой элемент для выравнивания */}
            </header>

            <main className="flex-grow px-4 space-y-8 py-4 z-10">
                
                {/* Информационная карточка приложения */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gray-800 rounded-3xl p-6 border border-gray-700/50 text-center shadow-lg"
                >
                    <Info className="w-10 h-10 text-brand-green mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">VoiceFin</h2>
                    <p className="text-base text-gray-400 mb-4">{t('yourPersonalFinanceAssistant')}</p>
                    <div className="inline-flex items-center bg-gray-700 rounded-full py-2 px-4">
                        <span className="text-sm font-semibold text-gray-300">{t('version')} {APP_VERSION}</span>
                    </div>
                </motion.div>

                {/* Секция истории изменений */}
                <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-100 px-2">{t('changelog')}</h3>
                    
                    {CHANGELOG.map((release, index) => (
                        <motion.div
                            key={release.version}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            // Анимация с задержкой для каждого элемента
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-gray-800 rounded-2xl p-5 border border-gray-700/50"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="text-lg font-bold text-white">
                                    {t('version')} {release.version}
                                </h4>
                                <div className="flex items-center text-sm text-gray-400 flex-shrink-0">
                                    <CalendarDays className="w-4 h-4 mr-1" />
                                    {release.date}
                                </div>
                            </div>
                            
                            <ul className="list-disc pl-5 space-y-1">
                                {release.changes.map((changeKey, i) => (
                                    <li key={i} className="text-sm text-gray-300">
                                        {t(changeKey)} 
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>
                <div className="h-16" />
            </main>
        </div>
    );
};