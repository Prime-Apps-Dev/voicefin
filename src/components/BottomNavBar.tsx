import React, { useRef, useCallback } from 'react';
import { Home, User, Mic, Square, PiggyBank, PieChart } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';

type Screen = 'home' | 'savings' | 'analytics' | 'profile';

interface BottomNavBarProps {
  activeScreen: Screen | 'accounts' | 'budgetPlanning' | 'categories' | 'settings';
  onNavigate: (screen: Screen) => void;
  isRecording: boolean;
  isProcessing: boolean;
  onToggleRecording: () => void;
  onLongPressAdd: () => void;
}

const NavButton = ({ screen, label, icon: Icon, activeScreen, onNavigate }: { screen: Screen, label: string, icon: React.ElementType, activeScreen: Screen | 'accounts' | 'budgetPlanning' | 'categories' | 'settings', onNavigate: (s: Screen) => void }) => {
    const isActive = activeScreen === screen || (screen === 'profile' && (activeScreen === 'accounts' || activeScreen === 'budgetPlanning' || activeScreen === 'categories' || activeScreen === 'settings'));
    
    // --- ИЗМЕНЕНИЯ ЗДЕСЬ: Условное применение hover/focus стилей ---
    // Базовые классы, общие для всех кнопок
    const baseClasses = 'flex flex-col items-center justify-center h-full py-4 px-1 text-xs transition-colors focus:outline-none';

    // Классы, зависящие от состояния активности
    const stateClasses = isActive
        ? 'text-brand-green' // Активная кнопка всегда зеленая
        : 'text-gray-400 hover:text-white focus:text-white'; // Неактивная кнопка серая, белая при наведении/фокусе

    return (
      <button
        key={screen}
        onClick={() => onNavigate(screen)}
        // Применяем классы
        className={`${baseClasses} ${stateClasses}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="w-6 h-6 mb-1" />
        <span>{label}</span>
      </button>
    );
  };
// --- КОНЕЦ ИЗМЕНЕНИЙ ---


export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeScreen, onNavigate, isRecording, isProcessing, onToggleRecording, onLongPressAdd }) => {
  const { t } = useLocalization();
  const isDisabled = isProcessing;
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const LONG_PRESS_DURATION = 500;

  const handlePressStart = useCallback(() => {
    if (isDisabled) return;
    longPressTriggered.current = false;
    pressTimer.current = setTimeout(() => {
      onLongPressAdd();
      longPressTriggered.current = true;
    }, LONG_PRESS_DURATION);
  }, [isDisabled, onLongPressAdd]);

  const handlePressEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
    if (!longPressTriggered.current && !isDisabled) {
      onToggleRecording();
    }
  }, [isDisabled, onToggleRecording]);

  const handlePressCancel = useCallback(() => {
     if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
    longPressTriggered.current = false;
  }, []);

  const getAddButtonIcon = () => {
    if (isProcessing) {
      return <div className="w-9 h-9 border-4 border-t-transparent border-white rounded-full animate-spin"></div>;
    }
    if (isRecording) {
      return <Square className="w-10 h-10 text-white" fill="white" />;
    }
    return <Mic className="w-10 h-10 text-white" />;
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 z-40 pb-[env(safe-area-inset-bottom)]">
      <nav className="grid grid-cols-5 items-center max-w-4xl mx-auto h-20">
        <NavButton screen="home" label={t('home')} icon={Home} activeScreen={activeScreen} onNavigate={onNavigate} />
        <NavButton screen="savings" label={t('savings')} icon={PiggyBank} activeScreen={activeScreen} onNavigate={onNavigate} />
        
        <div className="flex justify-center">
            <div className="-mt-10 text-center">
                <button 
                    onMouseDown={handlePressStart}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressCancel}
                    onTouchStart={handlePressStart}
                    onTouchEnd={handlePressEnd}
                    onTouchCancel={handlePressCancel}
                    onContextMenu={(e) => e.preventDefault()}
                    disabled={isDisabled}
                    aria-label={isRecording ? t('stopRecording') : t('startRecording')}
                    className={`
                        relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out
                        focus:outline-none focus:ring-4 focus:ring-opacity-50
                        ${isRecording ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300' : 'bg-brand-green hover:bg-green-600 focus:ring-green-300'}
                        ${isDisabled ? 'cursor-not-allowed bg-gray-600' : ''}
                        border-4 border-gray-900
                    `}
                >
                    {isRecording && !isProcessing && <div className="absolute inset-0 rounded-full bg-red-400 animate-ping"></div>}
                    {getAddButtonIcon()}
                </button>
            </div>
        </div>
        
        <NavButton screen="analytics" label={t('analytics')} icon={PieChart} activeScreen={activeScreen} onNavigate={onNavigate} />
        <NavButton screen="profile" label={t('profile')} icon={User} activeScreen={activeScreen} onNavigate={onNavigate} />
      </nav>
    </footer>
  );
};