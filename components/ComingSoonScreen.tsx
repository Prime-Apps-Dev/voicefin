import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Construction } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';

interface ComingSoonScreenProps {
  onBack: () => void;
}

export const ComingSoonScreen: React.FC<ComingSoonScreenProps> = ({ onBack }) => {
  const { t } = useLocalization();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="px-4 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">{t('comingSoon')}</h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>
      <main className="flex-grow flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center p-6"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-yellow-500/10 rounded-full flex items-center justify-center">
            <Construction className="w-12 h-12 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{t('comingSoon')}</h2>
          <p className="text-gray-400 max-w-xs">{t('featureInProgress')}</p>
        </motion.div>
      </main>
    </div>
  );
};
