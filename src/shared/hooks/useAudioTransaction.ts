import { useState, useRef } from 'react';
import * as api from '../../core/services/api';
import { Transaction, Category, SavingsGoal, Account, TransactionType } from '../../core/types';
import { useLocalization } from '../../core/context/LocalizationContext';

interface DraftTransaction extends Omit<Transaction, 'id'> {
  fromAccountName?: string;
  toAccountName?: string;
  savingsGoalName?: string;
}

interface UseAudioTransactionResult {
  isRecording: boolean;
  isProcessing: boolean;
  stream: MediaStream | null;
  transcription: string;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  audioContext: AudioContext | null;
  processAudioResult: (
    categories: Category[], 
    savingsGoals: SavingsGoal[],
    accounts: Account[], 
    defaultCurrency: string
  ) => Promise<DraftTransaction | null>;
}

export const useAudioTransaction = (
  onError: (msg: string) => void
): UseAudioTransactionResult => {
  const { language, t } = useLocalization();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [transcription, setTranscription] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startRecording = async () => {
    if (isRecording) return;
    setTranscription('');
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      setIsRecording(true);

      const mimeType = [
        'audio/webm;codecs=opus', 
        'audio/ogg;codecs=opus', 
        'audio/webm', 
        'audio/mp4'
      ].find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';

      const recorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      onError(t('micError'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsProcessing(true);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processAudioResult = async (
    categories: Category[], 
    savingsGoals: SavingsGoal[],
    accounts: Account[], 
    defaultCurrency: string 
  ): Promise<DraftTransaction | null> => {
    return new Promise((resolve, reject) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) {
            setIsProcessing(false);
            return resolve(null);
        }

        recorder.onstop = async () => {
            stream?.getTracks().forEach(track => track.stop());
            setStream(null);

            const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            audioChunksRef.current = [];

            let attempts = 0;
            const maxAttempts = 3;
            let result: DraftTransaction | null = null;
            let lastError: any = null;

            // RETRY LOGIC
            while (attempts < maxAttempts) {
                try {
                    attempts++;
                    console.log(`API: Processing audio attempt ${attempts}/${maxAttempts}...`);
                    
                    result = await api.processAudioTransaction(
                        audioBlob,
                        categories,
                        savingsGoals,
                        accounts,
                        language,
                        defaultCurrency
                    ) as DraftTransaction;

                    break;
                } catch (err: any) {
                    console.warn(`API: Attempt ${attempts} failed:`, err);
                    lastError = err;
                    const errorMessage = err.message || JSON.stringify(err);
                    const isOverloaded = 
                        errorMessage.includes('503') || 
                        errorMessage.includes('overloaded') ||
                        errorMessage.includes('Service Unavailable') ||
                        (errorMessage.includes('500') && errorMessage.includes('GoogleGenerativeAI'));

                    if (isOverloaded && attempts < maxAttempts) {
                        await delay(2000);
                        continue;
                    } else {
                        setIsProcessing(false);
                        reject(err);
                        return;
                    }
                }
            }

            if (!result) {
                setIsProcessing(false);
                reject(lastError || new Error("Failed to process audio"));
                return;
            }

            try {
                // --- FALLBACK LOGIC ---
                
                if (result.fromAccountName) {
                  const foundAccount = accounts.find(a => 
                    a.name.toLowerCase().includes(result.fromAccountName!.toLowerCase()) ||
                    result.fromAccountName!.toLowerCase().includes(a.name.toLowerCase())
                  );
                  
                  if (foundAccount) {
                    result.accountId = foundAccount.id;
                  } else {
                    if (result.fromAccountName.toLowerCase().includes('card') || 
                        result.fromAccountName.toLowerCase().includes('карт')) {
                      const cardAccount = accounts.find(a => a.type === 'CARD');
                      if (cardAccount) result.accountId = cardAccount.id;
                    } else if (result.fromAccountName.toLowerCase().includes('cash') || 
                               result.fromAccountName.toLowerCase().includes('налич')) {
                      const cashAccount = accounts.find(a => a.type === 'CASH');
                      if (cashAccount) result.accountId = cashAccount.id;
                    }
                  }
                }
                
                if (result.type === TransactionType.TRANSFER && result.toAccountName) {
                  const foundToAccount = accounts.find(a => 
                    a.name.toLowerCase().includes(result.toAccountName!.toLowerCase()) ||
                    result.toAccountName!.toLowerCase().includes(a.name.toLowerCase())
                  );
                  
                  if (foundToAccount) {
                    result.toAccountId = foundToAccount.id;
                  } else {
                    if (result.toAccountName.toLowerCase().includes('cash') || 
                        result.toAccountName.toLowerCase().includes('налич')) {
                      const cashAccount = accounts.find(a => a.type === 'CASH');
                      if (cashAccount) result.toAccountId = cashAccount.id;
                    } else if (result.toAccountName.toLowerCase().includes('card') || 
                               result.toAccountName.toLowerCase().includes('карт')) {
                      const cardAccount = accounts.find(a => a.type === 'CARD');
                      if (cardAccount) result.toAccountId = cardAccount.id;
                    }
                  }
                }
                
                if (result.type === TransactionType.EXPENSE && result.toAccountName) {
                  result.type = TransactionType.TRANSFER;
                  result.category = '';
                }
                
                if (result.type === TransactionType.TRANSFER && !result.toAccountId && !result.toAccountName) {
                  result.type = TransactionType.EXPENSE;
                }

                // 4. Маппинг savingsGoalName на goalId
                // ИСПРАВЛЕНО: Только маппинг, удаление перенесено ниже
                if (result.savingsGoalName && savingsGoals.length > 0) {
                  const goal = savingsGoals.find(
                    g => g.name.toLowerCase() === result.savingsGoalName!.toLowerCase()
                  );
                  if (goal) {
                    result.goalId = goal.id;
                  }
                }

                // 5. Очистка временных полей
                // ИСПРАВЛЕНО: savingsGoalName удаляется здесь ГАРАНТИРОВАННО
                delete (result as any).fromAccountName;
                delete (result as any).toAccountName;
                delete (result as any).savingsGoalName; 

                console.log('Final processed transaction:', result);
                resolve(result);
            } catch (err: any) {
                console.error('Failed to process result logic:', err);
                reject(err);
            } finally {
                setIsProcessing(false);
            }
        };
    });
  };

  return {
    isRecording,
    isProcessing,
    stream,
    transcription,
    startRecording,
    stopRecording,
    audioContext: audioCtxRef.current,
    processAudioResult
  };
};