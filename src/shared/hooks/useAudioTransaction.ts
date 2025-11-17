// src/shared/hooks/useAudioTransaction.ts

import { useState, useRef } from 'react';
import * as api from '../../core/services/api';
import { Transaction, Category, SavingsGoal, TransactionType } from '../../core/types';
import { useLocalization } from '../../core/context/LocalizationContext';

// Расширяем тип результата, так как API может вернуть дополнительные поля (имена счетов)
// которые еще не являются ID.
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
    savingsGoals: SavingsGoal[]
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

      // Проверяем поддержку кодеков
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

  const processAudioResult = async (
    categories: Category[], 
    savingsGoals: SavingsGoal[]
  ): Promise<DraftTransaction | null> => {
    return new Promise((resolve, reject) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) {
            setIsProcessing(false);
            return resolve(null);
        }

        // Мы используем onstop, чтобы гарантировать, что запись завершена
        recorder.onstop = async () => {
            // Останавливаем треки микрофона
            stream?.getTracks().forEach(track => track.stop());
            setStream(null);

            const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            audioChunksRef.current = [];

            try {
                const result = await api.processAudioTransaction(
                    audioBlob,
                    categories,
                    savingsGoals,
                    language
                ) as DraftTransaction;

                // --- ЛОГИКА ИСПРАВЛЕНИЯ (FALLBACK) ---
                
                // Если ИИ определил как РАСХОД, но указал счет ПОЛУЧАТЕЛЯ -> это ПЕРЕВОД
                if (result.type === TransactionType.EXPENSE && result.toAccountName) {
                  console.log('Correcting transaction type: EXPENSE -> TRANSFER based on toAccountName presence.');
                  result.type = TransactionType.TRANSFER;
                  result.category = ''; // У переводов нет категории
                }

                // Если ИИ определил как ПЕРЕВОД, но не указал категорию, все ок.
                // Если ИИ определил как ДОХОД, но указал sourceAccountName, это тоже ок.

                resolve(result);
            } catch (err: any) {
                console.error('Failed to process audio:', err);
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