import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalization } from '../context/LocalizationContext';

interface TimePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (date: Date) => void;
  initialTime: Date;
}

const padZero = (num: number) => num.toString().padStart(2, '0');

export const TimePicker: React.FC<TimePickerProps> = ({ isOpen, onClose, onApply, initialTime }) => {
  const { t } = useLocalization();
  const [selectedHour, setSelectedHour] = useState(initialTime.getHours());
  const [selectedMinute, setSelectedMinute] = useState(initialTime.getMinutes());

  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const hourScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minuteScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setScrollPosition = (
    ref: React.RefObject<HTMLDivElement>, 
    index: number
  ) => {
    const element = ref.current;
    if (element && element.children.length > 1) {
      const firstItem = element.children[1] as HTMLElement;
      const itemHeight = firstItem.offsetHeight;
      if (itemHeight > 0) {
        element.scrollTop = index * itemHeight;
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      const currentHour = initialTime.getHours();
      const currentMinute = initialTime.getMinutes();
      setSelectedHour(currentHour);
      setSelectedMinute(currentMinute);

      // A short delay to ensure elements are rendered before we calculate height and scroll
      setTimeout(() => {
        setScrollPosition(hoursRef, currentHour);
        setScrollPosition(minutesRef, currentMinute);
      }, 50);
    }
  }, [isOpen, initialTime]);
  
  const handleApply = () => {
    const newDate = new Date(initialTime);
    newDate.setHours(selectedHour);
    newDate.setMinutes(selectedMinute);
    onApply(newDate);
  };
  
  const handleScroll = (type: 'hour' | 'minute') => {
    const ref = type === 'hour' ? hoursRef : minutesRef;
    const timerRef = type === 'hour' ? hourScrollTimer : minuteScrollTimer;
    const setter = type === 'hour' ? setSelectedHour : setSelectedMinute;
    const maxIndex = type === 'hour' ? 23 : 59;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      if (ref.current) {
        // The first child is the top padding div. The items start from the second child.
        const firstItem = ref.current.children[1] as HTMLElement;
        if (!firstItem) return;

        const itemHeight = firstItem.offsetHeight;
        if (itemHeight === 0) return; // Avoid division by zero

        const { scrollTop } = ref.current;
        const index = Math.round(scrollTop / itemHeight);
        
        const boundedIndex = Math.max(0, Math.min(index, maxIndex));
        setter(boundedIndex);
      }
    }, 150);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-xs border border-zinc-800/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <h3 className="text-lg font-semibold text-center text-white mb-4">{t('time')}</h3>
              <div className="relative h-48 flex justify-center items-center gap-4 text-2xl overflow-hidden">
                {/* Highlight Bar */}
                <div className="absolute top-1/2 -translate-y-1/2 h-12 w-full bg-zinc-800/50 rounded-xl pointer-events-none z-10" />
                
                {/* Hours Column */}
                <div 
                  ref={hoursRef}
                  onScroll={() => handleScroll('hour')}
                  className="w-1/2 h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
                  style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)' }}
                >
                  <div className="h-[calc(50%-1.5rem)]"></div>
                  {hours.map(hour => (
                    <div 
                      key={hour}
                      className={`h-12 flex items-center justify-center snap-center transition-all duration-200 ${selectedHour === hour ? 'text-white font-bold scale-110' : 'text-zinc-500 scale-90'}`}
                    >
                      {padZero(hour)}
                    </div>
                  ))}
                  <div className="h-[calc(50%-1.5rem)]"></div>
                </div>

                <div className="text-2xl font-bold text-zinc-500 z-20">:</div>

                {/* Minutes Column */}
                <div 
                  ref={minutesRef}
                  onScroll={() => handleScroll('minute')}
                  className="w-1/2 h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
                  style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)' }}
                >
                  <div className="h-[calc(50%-1.5rem)]"></div>
                  {minutes.map(minute => (
                    <div 
                      key={minute}
                      className={`h-12 flex items-center justify-center snap-center transition-all duration-200 ${selectedMinute === minute ? 'text-white font-bold scale-110' : 'text-zinc-500 scale-90'}`}
                    >
                      {padZero(minute)}
                    </div>
                  ))}
                  <div className="h-[calc(50%-1.5rem)]"></div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-4 bg-zinc-900/50 border-t border-zinc-800/60 rounded-b-3xl">
              <button onClick={onClose} className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200">{t('cancel')}</button>
              <button onClick={handleApply} className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200">{t('apply')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};