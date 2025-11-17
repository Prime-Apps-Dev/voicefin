import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalization } from '../../../core/context/LocalizationContext';

const loadingTextKeys = [
  "loadingConnect",
  "loadingPixels",
  "loadingAI",
  "loadingNetWorth",
  "loadingSecure",
  "loadingOrganize",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: 'easeInOut' } },
  exit: { opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const textVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -15, transition: { duration: 0.5, ease: 'easeIn' } },
};

const loaderContainerVariants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
}

const barVariants = {
    initial: { height: '8px' },
    animate: (i: number) => ({
        height: ['8px', `${[48, 64, 32, 56][i % 4]}px`, '8px'],
        transition: {
            duration: 1.2 + i * 0.2,
            repeat: Infinity,
            ease: "easeInOut",
        }
    })
}


export const LoadingScreen: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  const { t } = useLocalization();
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setTextIndex((prevIndex) => (prevIndex + 1) % loadingTextKeys.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-[200]"
        >
          <motion.div
            variants={loaderContainerVariants}
            initial="initial"
            animate="animate"
            className="flex items-end justify-center h-16 w-24 gap-2 mb-8"
          >
            {[...Array(4)].map((_, i) => (
                <motion.div
                    key={i}
                    custom={i}
                    className="w-4 bg-brand-green rounded-t-sm"
                    variants={barVariants}
                />
            ))}
          </motion.div>

          <div className="relative h-8 w-full max-w-sm text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={textIndex}
                variants={textVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute inset-0 text-lg text-gray-400"
              >
                {t(loadingTextKeys[textIndex])}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
