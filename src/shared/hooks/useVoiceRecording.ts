import { useState, useEffect, useRef } from 'react';

// Описываем полное состояние нашего рекордера
export interface VoiceRecordingState {
  permissionState: 'prompt' | 'granted' | 'denied';
  isRecording: boolean;
  isProcessing: boolean;
  stream: MediaStream | null;
  audioContext: AudioContext | null;
  transcription: string;
  showPermissionDeniedMessage: boolean;
}

/**
 * Хук для управления всем процессом записи голоса,
 * включая управление разрешениями.
 */
export const useVoiceRecording = () => {
  const [state, setState] = useState<VoiceRecordingState>({
    permissionState: 'prompt', // Начинаем с 'prompt'
    isRecording: false,
    isProcessing: false,
    stream: null,
    audioContext: null,
    transcription: '',
    showPermissionDeniedMessage: false,
  });

  // Используем ref'ы для хранения объектов, которые не должны вызывать рендер
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // 1. Проверяем текущее состояние разрешения при монтировании
  useEffect(() => {
    let isMounted = true;
    
    // Используем Permissions API, если оно доступно
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then((status) => {
          if (!isMounted) return;
          // Устанавливаем начальное состояние
          setState(s => ({ ...s, permissionState: status.state }));
          
          // Подписываемся на изменения (если пользователь меняет в настройках)
          status.onchange = () => {
            if (isMounted) setState(s => ({ ...s, permissionState: status.state }));
          };
        })
        .catch(err => {
          // В некоторых Webview (очень редких) это API может быть недоступно
          console.warn('Permissions API query failed:', err);
          // Остаемся в состоянии 'prompt'
        });
    }

    return () => { isMounted = false; };
  }, []);

  // 2. Функция начала записи
  const startRecording = async () => {
    if (state.isRecording || state.isProcessing) return;

    // Если мы знаем, что доступ запрещен, показываем сообщение
    if (state.permissionState === 'denied') {
      console.error("Microphone permission is denied.");
      setState(s => ({ ...s, showPermissionDeniedMessage: true }));
      return;
    }

    try {
      // Это тот самый вызов, который запросит разрешение (если state === 'prompt')
      // или просто вернет поток (если state === 'granted')
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Пользователь нажал "Разрешить" (или уже разрешал)
      const context = new AudioContext();

      // Сохраняем в ref'ы
      streamRef.current = mediaStream;
      audioContextRef.current = context;

      // Обновляем состояние, чтобы UI отреагировал
      setState(s => ({
        ...s,
        isRecording: true,
        stream: mediaStream,
        audioContext: context,
        permissionState: 'granted', // Теперь мы точно знаем, что
        transcription: '', // Очищаем старую
        showPermissionDeniedMessage: false, // Прячем ошибку, если была
      }));
      
      //
      // ЗДЕСЬ ВЫ ДОБАВЛЯЕТЕ ВАШУ ЛОГИКУ ОБРАБОТКИ АУДИО
      // (Отправка на сервер, WebSockets, и т.д.)
      //
      
      // Мок-ап транскрипции для демо
      setTimeout(() => {
        if (streamRef.current) setState(s => ({ ...s, transcription: "Я купил кофе" }));
      }, 2000);
      setTimeout(() => {
         if (streamRef.current) setState(s => ({ ...s, transcription: "Я купил кофе за 5 долларов" }));
      }, 4000);

    } catch (err) {
      const error = err as Error;
      // Пользователь нажал "Блокировать"
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setState(s => ({ ...s, permissionState: 'denied', showPermissionDeniedMessage: true }));
      } else {
        // Другая ошибка (например, микрофон не найден)
        console.error("Error starting recording:", error);
      }
    }
  };

  // 3. Функция остановки записи
  const stopRecording = () => {
    if (!state.isRecording) return;

    // Корректно останавливаем все дорожки
    streamRef.current?.getTracks().forEach(track => track.stop());
    // Закрываем AudioContext
    audioContextRef.current?.close();

    // Очищаем ref'ы
    streamRef.current = null;
    audioContextRef.current = null;

    // Обновляем состояние
    setState(s => ({
      ...s,
      isRecording: false,
      stream: null, // Это закроет RecordingOverlay
      audioContext: null,
      isProcessing: true, // Включаем спиннер
      transcription: s.transcription, // Сохраняем последнюю транскрипцию
    }));

    //
    // ЗДЕСЬ ВЫ ПОЛУЧАЕТЕ ФИНАЛЬНЫЙ РЕЗУЛЬТАТ
    //
    
    // Имитируем обработку на сервере
    setTimeout(() => {
      setState(s => ({ ...s, isProcessing: false }));
      // Теперь пользователь видит финальный результат и кнопку "Record"
    }, 1500);
  };

  // 4. Функция для UI, чтобы скрыть сообщение об ошибке
  const setShowPermissionDeniedMessage = (show: boolean) => {
    setState(s => ({ ...s, showPermissionDeniedMessage: show }));
  };

  return {
    state,
    startRecording,
    stopRecording,
    setShowPermissionDeniedMessage,
  };
};