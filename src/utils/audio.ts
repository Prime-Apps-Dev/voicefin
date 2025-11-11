// src/utils/audio.ts

import { useState, useRef, useCallback } from 'react';
// Предполагаем, что типы Transaction, Category и SavingsGoal определены в src/types.ts
import { Transaction, Category, SavingsGoal } from '../types'; 

interface VoiceTranscriptionOptions {
    categories: Category[];
    savingsGoals: SavingsGoal[];
    language: string;
    edgeFunctionUrl: string;
    onTranscriptionUpdate?: (text: string) => void;
    onTransactionComplete?: (transaction: Transaction) => void;
    onError?: (error: string) => void;
}

export const useVoiceTranscription = (options: VoiceTranscriptionOptions) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcription, setTranscription] = useState('');
    // НОВОЕ СОСТОЯНИЕ: для хранения финальной распознанной транзакции
    const [processedTransaction, setProcessedTransaction] = useState<Transaction | null>(null); 
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Начать запись
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                } 
            });
            
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await processAudioStream(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            setIsRecording(true);
            setTranscription('');
            // СБРОС: Сбрасываем транзакцию перед новой записью
            setProcessedTransaction(null); 
        } catch (error: any) {
            options.onError?.(`Не удалось получить доступ к микрофону: ${error.message}`);
        }
    }, [options]);

    // Остановить запись
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsProcessing(true); // НАЧИНАЕМ ОБРАБОТКУ
        }
    }, [isRecording]);

    // Переключить запись
    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    // Обработать аудио через streaming API
    const processAudioStream = async (audioBlob: Blob) => {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'transaction.webm');
            formData.append('context', JSON.stringify({
                categories: options.categories,
                savingsGoals: options.savingsGoals,
                language: options.language
            }));
            formData.append('stream', 'true');
            // ВАЖНО: Edge function URL должен быть предоставлен через пропсы
            const response = await fetch(options.edgeFunctionUrl, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                // Пытаемся прочитать тело ответа для получения подробной ошибки
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
                } catch {
                    throw new Error(`HTTP error! status: ${response.status}. Message: ${errorText.substring(0, 100)}...`);
                }
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Response body is not readable');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'transcription') {
                            // Накапливаем транскрипцию
                            setTranscription(data.text);
                            options.onTranscriptionUpdate?.(data.text);
                        } else if (data.type === 'transaction') {
                            // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: сохраняем транзакцию в стейт
                            setProcessedTransaction(data.transaction as Transaction); 
                            options.onTransactionComplete?.(data.transaction);
                        } else if (data.type === 'error') {
                            options.onError?.(data.error);
                        }
                    }
                }
            }
            
        } catch (error: any) {
            options.onError?.(`Ошибка обработки: ${error.message}`);
        } finally {
            // ОЧИСТКА: isProcessing устанавливается в false только после завершения потока
            setIsProcessing(false); 
        }
    };
    
    const resetState = useCallback(() => {
        setIsRecording(false);
        setIsProcessing(false);
        setTranscription('');
        setProcessedTransaction(null);
    }, []);

    return {
        isRecording,
        isProcessing,
        transcription,
        processedTransaction, // НОВОЕ ПОЛЕ
        toggleRecording,
        resetState,
    };
};