// src/hooks/useAudioTransaction.ts

import { useState, useRef } from 'react';
import * as api from '../../core/services/api';
import { Transaction, Category, SavingsGoal } from '../../core/types';
import { useLocalization } from '../../core/context/LocalizationContext';

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
  ) => Promise<Omit<Transaction, 'id'> | null>;
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
    setTranscription(''); // Clear previous
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
        'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'
      ].find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';

      const recorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
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
  ): Promise<Omit<Transaction, 'id'> | null> => {
    return new Promise((resolve, reject) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) {
            setIsProcessing(false);
            return resolve(null);
        }

        // The 'stop' event handler for the recorder logic needs to be here 
        // or we wait for it. Since we stop manually, we can tap into onstop.
        recorder.onstop = async () => {
            stream?.getTracks().forEach(track => track.stop());
            setStream(null);

            const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            audioChunksRef.current = [];

            try {
                // Note: api.processAudioTransaction might return a transaction object 
                // but ideally it also returns transcription text. 
                // Assuming current API structure based on original code.
                const newTransaction = await api.processAudioTransaction(
                    audioBlob,
                    categories,
                    savingsGoals,
                    language
                );
                resolve(newTransaction);
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