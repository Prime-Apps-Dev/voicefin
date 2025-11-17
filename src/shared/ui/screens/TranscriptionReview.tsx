import React from 'react';
import { motion } from 'framer-motion';

interface TranscriptionReviewProps {
  transcription: string;
}

export const TranscriptionReview: React.FC<TranscriptionReviewProps> = ({ transcription }) => {
  return (
    <motion.div
      key="review-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-gray-900/95 flex items-center justify-center z-40 p-8"
    >
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        className="text-3xl md:text-4xl font-semibold text-center text-gray-100 leading-relaxed max-w-3xl"
        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
      >
        {transcription}
      </motion.p>
    </motion.div>
  );
};
