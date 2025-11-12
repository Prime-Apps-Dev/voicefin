import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalization } from '../context/LocalizationContext';
import { Mic, Type, Wallet, LayoutGrid, PartyPopper } from 'lucide-react';

interface OnboardingGuideProps {
  onFinish: () => void;
}

const steps = [
  {
    titleKey: 'onboardingWelcomeTitle',
    textKey: 'onboardingWelcomeText',
    icon: PartyPopper,
  },
  {
    titleKey: 'onboardingVoiceTitle',
    textKey: 'onboardingVoiceText',
    icon: Mic,
  },
  {
    titleKey: 'onboardingTextTitle',
    textKey: 'onboardingTextText',
    icon: Type,
  },
  {
    titleKey: 'onboardingAccountsTitle',
    textKey: 'onboardingAccountsText',
    icon: Wallet,
  },
  {
    titleKey: 'onboardingBudgetsTitle',
    textKey: 'onboardingBudgetsText',
    icon: LayoutGrid,
  },
  {
    titleKey: 'onboardingFinishTitle',
    textKey: 'onboardingFinishText',
    icon: PartyPopper,
  },
];

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onFinish }) => {
  const { t } = useLocalization();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentStep(prev => prev + newDirection);
  };

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    })
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-[100] p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm h-[28rem] overflow-hidden flex flex-col border border-zinc-800/60"
      >
        <div className="absolute top-4 right-4 z-20">
            <button
                onClick={onFinish}
                className="text-zinc-500 hover:text-white text-sm font-medium px-3 py-1 rounded-full hover:bg-zinc-800 transition-colors"
            >
                {t('skip')}
            </button>
        </div>
        
        <div className="flex-grow relative flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="absolute w-full h-full flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-20 h-20 bg-brand-green/10 rounded-full flex items-center justify-center mb-6">
                <IconComponent className="w-10 h-10 text-brand-green" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{t(currentStepData.titleKey)}</h2>
              <p className="text-zinc-400 leading-relaxed">{t(currentStepData.textKey)}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 flex flex-col items-center gap-4 border-t border-zinc-800/60">
            <div className="flex gap-2">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${currentStep === i ? 'bg-brand-green w-4' : 'bg-zinc-700'}`}
                    />
                ))}
            </div>
          
            <div className="w-full flex justify-between items-center">
              <button
                onClick={() => paginate(-1)}
                disabled={currentStep === 0}
                className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t('back')}
              </button>
              {currentStep < steps.length - 1 ? (
                <button
                    onClick={() => paginate(1)}
                    className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200"
                >
                    {t('next')}
                </button>
              ) : (
                <button
                    onClick={onFinish}
                    className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200"
                >
                    {t('getStarted')}
                </button>
              )}
            </div>
        </div>

      </motion.div>
    </motion.div>
  );
};
