
import React from 'react';
import { Mic, Square } from 'lucide-react';

interface RecordButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onToggleRecording: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({ isRecording, isProcessing, onToggleRecording }) => {
  const isDisabled = isProcessing;

  const buttonClasses = `
    relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out
    focus:outline-none focus:ring-4
    ${isRecording ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400' : 'bg-brand-green hover:bg-green-600 focus:ring-green-400'}
    ${isDisabled ? 'cursor-not-allowed bg-gray-600' : 'cursor-pointer'}
  `;

  const iconClasses = 'w-8 h-8 text-white';

  return (
    <div className="flex flex-col items-center justify-center my-6">
      <button onClick={onToggleRecording} className={buttonClasses} disabled={isDisabled}>
        {isRecording && <div className="absolute inset-0 rounded-full bg-red-400 animate-ping"></div>}
        {isProcessing ? (
          <div className="w-8 h-8 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
        ) : isRecording ? (
          <Square className={iconClasses} fill="white" />
        ) : (
          <Mic className={iconClasses} />
        )}
      </button>
      <p className="mt-4 text-gray-400 text-sm h-6">
        {isProcessing 
          ? "Processing your transaction..." 
          : isRecording 
          ? "Listening..." 
          : "Tap to add a transaction"}
      </p>
    </div>
  );
};
