import React, { useState, useEffect } from 'react';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: { startDate: string, endDate: string }) => void;
    initialStartDate: string;
    initialEndDate: string;
}

/**
 * МОДАЛЬНОЕ ОКНО ФИЛЬТРАЦИИ (FilterModal)
 * Позволяет пользователю выбрать начальную и конечную дату для истории транзакций.
 */
const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, initialStartDate, initialEndDate }) => {
    
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    
    // Сброс состояния при открытии формы
    useEffect(() => {
        if (isOpen) {
            setStartDate(initialStartDate);
            setEndDate(initialEndDate);
        }
    }, [isOpen, initialStartDate, initialEndDate]);


    const handleApplyClick = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (new Date(startDate) > new Date(endDate)) {
            console.warn('Начальная дата не может быть позже конечной.');
            return;
        }

        onApply({ startDate, endDate });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-70 flex items-end justify-center z-50 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-t-3xl shadow-2xl w-full max-w-lg transform transition-transform duration-300 translate-y-0"
                 role="dialog"
                 aria-modal="true"
            >
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Фильтр Истории Транзакций</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 transition rounded-full">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleApplyClick} className="space-y-4">
                    
                    {/* 1. Начальная дата */}
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Начальная дата</label>
                        {/* Используем компонент DatePicker (предполагаем, что он существует) */}
                        <DatePicker 
                            selectedDate={startDate} 
                            onDateChange={setStartDate} 
                            inputClassName="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-white"
                        />
                    </div>
                    
                    {/* 2. Конечная дата */}
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Конечная дата</label>
                        <DatePicker 
                            selectedDate={endDate} 
                            onDateChange={setEndDate} 
                            inputClassName="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-white"
                        />
                    </div>

                    {/* Кнопка Отправки */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                        >
                            Применить Фильтры
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

// Заглушка для компонента DatePicker, если он не был предоставлен
const DatePicker: React.FC<{
    selectedDate: string;
    onDateChange: (date: string) => void;
    inputClassName: string;
}> = ({ selectedDate, onDateChange, inputClassName }) => {
    return (
        <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className={inputClassName}
        />
    );
};


export default FilterModal;