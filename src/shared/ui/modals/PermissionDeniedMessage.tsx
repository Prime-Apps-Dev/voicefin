import React from 'react';
// Используем иконку X (крестик)
import { AlertTriangle, X } from 'lucide-react';
// Предполагаем, что у вас есть этот хук (из RecordingOverlay.tsx)
import { useLocalization } from '../core/context/LocalizationContext';

interface PermissionDeniedMessageProps {
  onDismiss: () => void;
}

export const PermissionDeniedMessage: React.FC<PermissionDeniedMessageProps> = ({ onDismiss }) => {
  const { t } = useLocalization();
  
  return (
    <div className="w-full max-w-md p-4 mb-4 bg-red-900 border border-red-700 text-red-100 rounded-lg flex items-center justify-between shadow-lg animate-pulse">
      <AlertTriangle className="w-5 h-5 mr-3 text-red-400" />
      <span className="flex-1 text-sm">
        {t('microphonePermissionDenied',)}
      </span>
      <button 
        onClick={onDismiss} 
        aria-label="Скрыть"
        className="ml-2 p-1 rounded-full hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        <X size={18} />
      </button>
    </div>
  );
};