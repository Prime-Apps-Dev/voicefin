// src/shared/hooks/useVoiceRecording.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { SpeechRecognitionEvent, SpeechRecognition } from '../../types/speech-recognition';

export interface VoiceRecordingState {
  permissionState: 'prompt' | 'granted' | 'denied';
  isRecording: boolean;
  isProcessing: boolean;
  stream: MediaStream | null;
  transcription: string;         // Живой текст для UI
  audioLevel: number;           // Громкость (0-100) для анимации волн
  showPermissionDeniedMessage: boolean;
}

export const useVoiceRecording = (language: string = 'ru-RU') => {
  const [state, setState] = useState<VoiceRecordingState>({
    permissionState: 'prompt',
    isRecording: false,
    isProcessing: false,
    stream: null,
    transcription: '',
    audioLevel: 0,
    showPermissionDeniedMessage: false,
  });

  // Refs для управления аудио и записью
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Refs для анализа звука и Web Speech API
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Refs для циклов и таймеров
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Настройки тишины
  const SILENCE_THRESHOLD = 5; // Уровень громкости (0-255), ниже которого считается тишина
  const SILENCE_DURATION = 2000; // 2 секунды тишины для остановки

  // 1. Проверка разрешений при маунте
  useEffect(() => {
    const checkPermissions = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setState(s => ({ ...s, permissionState: status.state }));
          status.onchange = () => {
            setState(s => ({ ...s, permissionState: status.state }));
          };
        } catch (e) {
          console.warn("Permission query not supported", e);
        }
      }
    };
    checkPermissions();
    
    // Очистка при размонтировании
    return () => {
      cleanup();
    };
  }, []);

  // Функция полной очистки ресурсов
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    streamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  // 2. Инициализация Web Speech API (Живой текст)
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      // Собираем результаты
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Обновляем UI текстом
      const currentText = finalTranscript || interimTranscript;
      // Если API дает накопительный результат, можно просто брать последний,
      // но для надежности комбинируем. В данном случае просто показываем то, что слышим.
      // Мы берем все результаты сессии, чтобы текст не исчезал.
      const allText = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
        
      setState(prev => ({ ...prev, transcription: allText }));
    };

    recognition.onerror = (event: any) => {
      // Игнорируем 'no-speech', так как это нормально при паузах
      if (event.error !== 'no-speech') {
        console.warn("Speech recognition error:", event.error);
      }
    };

    return recognition;
  }, [language]);

  // 3. Анализ звука (Визуализация + Тишина)
  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const analyze = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Средняя громкость
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      
      // Нормализация для UI (0-100)
      // Усиливаем сигнал (x2.5), чтобы волны реагировали даже на тихий голос
      const normalizedLevel = Math.min(100, average * 2.5);
      
      // Оптимизация рендеринга: обновляем стейт только если есть изменения
      // или используем RAF. Здесь обновляем каждый кадр, React 18 батчит это.
      setState(prev => ({ ...prev, audioLevel: normalizedLevel }));

      // --- ЛОГИКА ДЕТЕКТОРА ТИШИНЫ ---
      if (average < SILENCE_THRESHOLD) {
        // Если сейчас тихо
        if (!silenceTimerRef.current) {
          // Запускаем таймер на остановку
          silenceTimerRef.current = setTimeout(() => {
            console.log("Silence detected, auto-stopping...");
            stopRecording();
          }, SILENCE_DURATION);
        }
      } else {
        // Если звук есть - сбрасываем таймер
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, []); // stopRecording добавлен ниже через замыкание или реф, но здесь используем hoisting функции внутри компонента

  const startRecording = async () => {
    if (state.isRecording || state.isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 1. Запуск MediaRecorder (запись в Blob)
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();

      // 2. Запуск Web Speech API (Текст)
      const recognition = initSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.warn("Recognition start error:", e);
        }
      }

      // 3. Запуск Анализатора (Волны + Тишина)
      startAudioAnalysis(stream);

      setState(s => ({
        ...s,
        isRecording: true,
        isProcessing: false,
        permissionState: 'granted',
        transcription: '',
        audioLevel: 0,
        showPermissionDeniedMessage: false,
        stream: stream // Сохраняем стрим, хотя UI он больше не нужен для AudioContext
      }));

    } catch (error: any) {
      console.error("Error starting recording:", error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setState(s => ({ ...s, permissionState: 'denied', showPermissionDeniedMessage: true }));
      }
    }
  };

  const stopRecording = useCallback(() => {
    // Останавливаем рекурсию анализатора
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    // Стоп Speech API
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }

    // Стоп MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Стоп треков
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Закрытие контекста
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setState(prev => {
      if (!prev.isRecording) return prev;
      return {
        ...prev,
        isRecording: false,
        isProcessing: true, // Переход в состояние обработки
        audioLevel: 0
      };
    });
  }, []);

  const getAudioBlob = useCallback((): Blob | null => {
    if (audioChunksRef.current.length === 0) return null;
    return new Blob(audioChunksRef.current, { type: 'audio/webm' });
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setState(s => ({
      ...s,
      isRecording: false,
      isProcessing: false,
      transcription: '',
      stream: null,
      audioLevel: 0
    }));
    audioChunksRef.current = [];
  }, [cleanup]);

  return {
    state,
    startRecording,
    stopRecording, // Теперь стабильная ссылка
    cancelRecording: reset, // Алиас для отмены
    setShowPermissionDeniedMessage: (show: boolean) => setState(s => ({ ...s, showPermissionDeniedMessage: show })),
    getAudioBlob,
    reset
  };
};