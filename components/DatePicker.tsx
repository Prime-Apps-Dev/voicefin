import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';

interface DatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (start: Date, end: Date) => void;
  initialStartDate: Date;
  initialEndDate: Date;
  selectionMode?: 'single' | 'range';
}

const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

export const DatePicker: React.FC<DatePickerProps> = ({ isOpen, onClose, onApply, initialStartDate, initialEndDate, selectionMode = 'range' }) => {
  const { t } = useLocalization();
  const [viewDate, setViewDate] = useState(initialEndDate);
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate);
  const [pickerView, setPickerView] = useState<'day' | 'month' | 'year'>('day');

  useEffect(() => {
    if (isOpen) {
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
      setViewDate(initialEndDate);
      setPickerView('day');
    }
  }, [isOpen, initialStartDate, initialEndDate]);

  const handleMonthChange = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleYearChange = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear() + offset, prev.getMonth(), 1));
  };
  
  const handleDecadeChange = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear() + (offset * 12), prev.getMonth(), 1));
  };

  const handleDayClick = (day: Date) => {
    if (selectionMode === 'single') {
        setStartDate(day);
        setEndDate(day);
    } else { // range mode
        if (!startDate || (startDate && endDate)) {
          setStartDate(day);
          setEndDate(null);
        } else if (startDate && !endDate) {
          if (day < startDate) {
            setEndDate(startDate);
            setStartDate(day);
          } else {
            setEndDate(day);
          }
        }
    }
  };
  
  const handleMonthClick = (monthIndex: number) => {
    setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1));
    setPickerView('day');
  };
  
  const handleYearClick = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setPickerView('month');
  };

  const handleApplyClick = () => {
    if (startDate) {
        const finalStartDate = new Date(startDate);
        finalStartDate.setHours(0,0,0,0);

        const finalEndDate = endDate ? new Date(endDate) : new Date(startDate);
        finalEndDate.setHours(23,59,59,999);
        
        onApply(finalStartDate, finalEndDate);
    }
  };

  const calendarGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // In JS Sunday is 0, Monday is 1, etc.
    const dayOfWeek = new Date(year, month, 1).getDay();
    const firstDayOfMonth = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to Monday being 0
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ key: `prev-${i}`, date: null, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      date.setHours(0,0,0,0);
      days.push({ 
        key: `current-${i}`, 
        date, 
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        isDisabled: date > today,
      });
    }

    const remainingCells = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ key: `next-${i}`, date: null, isCurrentMonth: false });
    }
    
    return days;
  }, [viewDate]);
  
  const yearGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const startYear = Math.floor((year - 1) / 12) * 12 + 1;
    const years = [];
    for (let i = 0; i < 12; i++) {
        years.push(startYear + i);
    }
    return years;
  }, [viewDate]);
  
  const months = t('months_full', {}) as unknown as string[];
  const daysShort = t('days_short', {}) as unknown as string[];
  
  const renderDayView = () => (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-400 mb-2">
        {daysShort.map(day => <div key={day} className="w-9 h-9 flex items-center justify-center">{day}</div>)}
      </div>
      <motion.div
        key={viewDate.toString()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-7 gap-1"
      >
        {calendarGrid.map(day => {
          if (!day.date) return <div key={day.key} className="w-9 h-9" />;

          const isSelected = startDate && isSameDay(day.date, startDate);
          const isStart = selectionMode === 'range' && startDate && isSameDay(day.date, startDate);
          const isEnd = selectionMode === 'range' && endDate && isSameDay(day.date, endDate);
          const inRange = selectionMode === 'range' && startDate && endDate && day.date > startDate && day.date < endDate;

          let classes = "w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-150 text-sm ";
          if (day.isDisabled) {
            classes += "text-zinc-600 cursor-not-allowed";
          } else {
            classes += "cursor-pointer ";
            if (selectionMode === 'single') {
              if (isSelected) {
                classes += "bg-brand-purple text-white font-bold";
              } else if (day.isToday) {
                classes += "text-brand-green border border-brand-green/50";
              } else {
                classes += "text-zinc-200 hover:bg-zinc-700";
              }
            } else { // range mode
              if (isStart && isEnd) {
                classes += "bg-brand-purple text-white font-bold";
              } else if (isStart) {
                classes += "bg-brand-purple text-white font-bold rounded-l-full rounded-r-none";
              } else if (isEnd) {
                classes += "bg-brand-purple text-white font-bold rounded-r-full rounded-l-none";
              } else if (inRange) {
                classes += "bg-brand-purple/20 text-white rounded-none";
              } else if (day.isToday) {
                classes += "text-brand-green border border-brand-green/50";
              } else {
                classes += "text-zinc-200 hover:bg-zinc-700";
              }
            }
          }
          
          let containerClasses = `flex items-center justify-center relative`;
           if (selectionMode === 'range') {
              if (inRange) {
                  containerClasses += " bg-brand-purple/20";
              }
              if (isStart && endDate) {
                containerClasses += " rounded-l-full";
              }
              if (isEnd && startDate) {
                containerClasses += " rounded-r-full";
              }
           }
          
          return (
            <div key={`container-${day.key}`} className={containerClasses}>
              <button 
                disabled={day.isDisabled}
                onClick={() => handleDayClick(day.date as Date)}
                className={classes}
              >
                {day.date.getDate()}
              </button>
            </div>
          );
        })}
      </motion.div>
    </>
  );

  const renderMonthView = () => (
    <motion.div
        key="month-view"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-3 gap-2 p-2"
    >
      {months.map((month, index) => (
        <button
          key={month}
          onClick={() => handleMonthClick(index)}
          className="p-3 rounded-xl text-sm text-center text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          {month.substring(0, 3)}
        </button>
      ))}
    </motion.div>
  );
  
  const renderYearView = () => (
    <motion.div
        key="year-view"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-4 gap-2 p-2"
    >
      {yearGrid.map(year => (
        <button
          key={year}
          onClick={() => handleYearClick(year)}
          className="p-2 rounded-xl text-sm text-center text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          {year}
        </button>
      ))}
    </motion.div>
  );

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
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (pickerView === 'day') handleMonthChange(-1);
                    else if (pickerView === 'month') handleYearChange(-1);
                    else handleDecadeChange(-1);
                  }}
                  className="p-2 rounded-full hover:bg-zinc-800"
                  aria-label="Previous period"
                >
                  <ChevronLeft className="w-5 h-5"/>
                </button>
                
                <div className="text-center">
                  {pickerView === 'day' && (
                    <button onClick={() => setPickerView('month')} className="font-semibold text-white text-base hover:bg-zinc-800 px-2 py-1 rounded-xl transition-colors">
                      {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                    </button>
                  )}
                  {pickerView === 'month' && (
                    <button onClick={() => setPickerView('year')} className="font-semibold text-white text-base hover:bg-zinc-800 px-2 py-1 rounded-xl transition-colors">
                      {viewDate.getFullYear()}
                    </button>
                  )}
                  {pickerView === 'year' && (
                    <span className="font-semibold text-white text-base px-2 py-1">
                      {yearGrid[0]} - {yearGrid[yearGrid.length - 1]}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (pickerView === 'day') handleMonthChange(1);
                    else if (pickerView === 'month') handleYearChange(1);
                    else handleDecadeChange(1);
                  }}
                  className="p-2 rounded-full hover:bg-zinc-800"
                  aria-label="Next period"
                >
                  <ChevronRight className="w-5 h-5"/>
                </button>
              </div>

              <div className="relative h-64">
                <AnimatePresence mode="wait">
                    {pickerView === 'day' && <motion.div key="day">{renderDayView()}</motion.div>}
                    {pickerView === 'month' && <motion.div key="month">{renderMonthView()}</motion.div>}
                    {pickerView === 'year' && <motion.div key="year">{renderYearView()}</motion.div>}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-4 bg-zinc-900/50 border-t border-zinc-800/60 rounded-b-3xl">
              <button onClick={onClose} className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200">{t('cancel')}</button>
              <button onClick={handleApplyClick} disabled={!startDate} className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200 disabled:bg-zinc-700 disabled:cursor-not-allowed">{t('apply')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};