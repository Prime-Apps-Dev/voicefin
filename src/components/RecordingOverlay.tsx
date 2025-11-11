// src/components/RecordingOverlay.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';

interface RecordingOverlayProps {
  transcription: string;
  stream: MediaStream | null;
  onStop: () => void;
  isRecording: boolean;
  audioContext: AudioContext | null;
}

const generateWavePath = (time: number, amplitude: number, frequency: number) => {
    // Эта функция остается без изменений
    const points = 100;
    const width = 800;
    const height = 150;
    const baseY = height * 0.4;
    
    let path = `M 0 ${height}`;
    
    for (let i = 0; i <= points; i++) {
      const x = (width / points) * i;
      const wave1 = Math.sin((i / points) * Math.PI * frequency + time) * amplitude;
      const wave2 = Math.sin((i / points) * Math.PI * frequency * 1.5 + time * 1.3) * amplitude * 0.5;
      const y = baseY + wave1 + wave2;
      
      if (i === 0) {
        path += ` L ${x} ${y}`;
      } else {
        const prevX = (width / points) * (i - 1);
        const cpX = (prevX + x) / 2;
        path += ` Q ${cpX} ${y} ${x} ${y}`;
      }
    }
    
    path += ` L ${width} ${height} L 0 ${height} Z`;
    return path;
};


export const RecordingOverlay: React.FC<RecordingOverlayProps> = ({ 
  transcription, 
  stream, 
  onStop, 
  isRecording,
  audioContext
}) => {
  const { t } = useLocalization();
  
  // ----------------------------------------------------------------
  // ✅ ИСПРАВЛЕНИЕ 1: Refs для прямого доступа к элементам (БЕЗ РЕ-РЕНДЕРА)
  // ----------------------------------------------------------------
  const [slowAudioLevel, setSlowAudioLevel] = useState(0); // Используется только для медленных анимаций (Glow, Transcription)
  const pathRef1 = useRef<SVGPathElement>(null);
  const pathRef2 = useRef<SVGPathElement>(null);
  const pathRef3 = useRef<SVGPathElement>(null);
  const levelBarRefs = useRef<(HTMLDivElement | null)[]>([]); // Ref для индикаторов уровня
  
  const currentLevelRef = useRef(0); // Текущий (быстрый) уровень звука
  const timeRef = useRef(0);         // Текущее (быстрое) время для волны
  const animationFrameId = useRef<number>(0);
  const startTimeRef = useRef(performance.now());
  const smoothedLevelRef = useRef(0);
  let frameCount = 0; // Счетчик кадров для "медленного" обновления состояния

  useEffect(() => {
      if (!stream || !audioContext) {
        currentLevelRef.current = 0;
        smoothedLevelRef.current = 0;
        setSlowAudioLevel(0);
        if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        return;
      };

      // Проверяем наличие Refs перед запуском цикла
      if (!pathRef1.current || !pathRef2.current || !pathRef3.current || levelBarRefs.current.length === 0) {
          console.error("SVG Path or Level Bar Refs not initialized.");
          return;
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 512;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
      const updateLoop = (timestamp: number) => {
        
        // 1. ОБНОВЛЕНИЕ ВРЕМЕНИ И УРОВНЯ ЗВУКА
        const elapsed = (timestamp - startTimeRef.current) / 1000;
        timeRef.current = elapsed * 2;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalized = Math.min(average / 128, 1);
        smoothedLevelRef.current += (normalized - smoothedLevelRef.current) * 0.15;
        currentLevelRef.current = smoothedLevelRef.current;


        // 2. 🚀 ПРЯМОЕ МАНИПУЛИРОВАНИЕ DOM ДЛЯ БЫСТРЫХ АНИМАЦИЙ (БЕЗ РЕ-РЕНДЕРА)
        const amp = 8 + currentLevelRef.current * 50;
        const time = timeRef.current;

        // Обновление SVG-волн
        pathRef1.current!.setAttribute('d', generateWavePath(time * 0.5, amp * 0.6, 2));
        pathRef2.current!.setAttribute('d', generateWavePath(time * 0.7, amp * 0.8, 2.5));
        pathRef3.current!.setAttribute('d', generateWavePath(time, amp, 3));

        // Обновление индикаторов уровня
        for (let i = 0; i < 5; i++) {
            const bar = levelBarRefs.current[i];
            if (bar) {
                const level = currentLevelRef.current;
                // Используем transform: scaleY для плавного и быстрого изменения
                bar.style.transform = `scaleY(${1 + (level > i * 0.2 ? level * 3 : 0)})`;
                bar.style.opacity = level > i * 0.2 ? '1' : '0.3';
            }
        }


        // 3. 🐢 МЕДЛЕННОЕ ОБНОВЛЕНИЕ СОСТОЯНИЯ REACT (ТОЛЬКО ДЛЯ GLOW И TEXT)
        frameCount++;
        if (frameCount % 5 === 0) { // Обновляем состояние только каждый 5-й кадр (~12 FPS)
            setSlowAudioLevel(currentLevelRef.current);
            frameCount = 0;
        }

        animationFrameId.current = requestAnimationFrame(updateLoop);
      };

      startTimeRef.current = performance.now();
      updateLoop(startTimeRef.current);
  
      return () => {
        cancelAnimationFrame(animationFrameId.current);
        source.disconnect();
        analyser.disconnect();
        smoothedLevelRef.current = 0;
        currentLevelRef.current = 0;
        setSlowAudioLevel(0);
      };
  }, [stream, audioContext]);

  // Используем медленное состояние для анимации, которая не должна быть 60 FPS
  const words = useMemo(() => transcription.split(' ').filter(w => w !== ''), [transcription]);
  const glowLevel = slowAudioLevel;

  return (
      <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center overflow-hidden z-50"
      >
          {/* Background glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-3xl transition-all duration-1000"
                  style={{
                      // Используем медленный glowLevel
                      background: `radial-gradient(circle, rgba(59, 130, 246, ${0.2 + glowLevel * 0.3}) 0%, rgba(236, 72, 153, ${0.1 + glowLevel * 0.2}) 50%, transparent 70%)`
                  }}
              />
          </div>
          
          <div className="flex flex-col items-center justify-between h-full w-full pt-24 pb-40">
              {/* Transcription */}
              <div className="relative z-10 w-full px-8 text-center">
                  <p className="text-3xl font-semibold text-white leading-relaxed max-w-3xl min-h-[120px] mx-auto">
                      <AnimatePresence>
                      {words.map((word, index) => (
                          <motion.span
                          key={`${word}-${index}`}
                          initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                          transition={{ duration: 0.2, ease: 'easeOut' }} 
                          className="inline-block mr-3"
                          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                          >
                          {word}
                          </motion.span>
                      ))}
                      {words.length === 0 && isRecording && (
                          <span className="text-gray-400">{t('startSpeaking')}</span>
                      )}
                      </AnimatePresence>
                  </p>
              </div>

              {/* Stop Button */}
              {isRecording && (
                <div className="relative z-10">
                    <button 
                        onClick={onStop}
                        aria-label={t('stopRecording')}
                        className="relative w-24 h-24 rounded-full flex items-center justify-center bg-brand-electric-red hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-400/50 transition-all duration-300 ease-in-out transform hover:scale-110"
                    >
                        <div 
                            className="absolute inset-0 rounded-full bg-red-400 opacity-30 transition-transform duration-300"
                            // Используем медленный glowLevel для плавности
                            style={{ transform: `scale(${1 + glowLevel * 0.3})` }}
                        />
                        <Square className="w-9 h-9 text-white" fill="white" />
                    </button>
                    <p className="text-center mt-4 text-gray-400 text-sm">
                        {t('listening')}
                    </p>
                </div>
              )}
          </div>
          
          {/* Waves */}
          <div className="absolute bottom-0 left-0 right-0 h-64 overflow-hidden pointer-events-none">
              <svg 
                  viewBox="0 0 800 150" 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-full"
                  style={{ 
                      minWidth: '800px', 
                      filter: 'blur(3px)' 
                  }}
                  preserveAspectRatio="none"
              >
                  <defs>
                      {/* Градиенты остаются */}
                      <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
                          <stop offset="30%" stopColor="rgba(191, 219, 254, 0.7)" />
                          <stop offset="70%" stopColor="rgba(96, 165, 250, 0.4)" />
                          <stop offset="100%" stopColor="rgba(59, 130, 246, 0.15)" />
                      </linearGradient>
                      <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(251, 146, 60, 0.4)" />
                          <stop offset="50%" stopColor="rgba(253, 186, 116, 0.25)" />
                          <stop offset="100%" stopColor="rgba(254, 215, 170, 0.08)" />
                      </linearGradient>
                      <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(236, 72, 153, 0.3)" />
                          <stop offset="50%" stopColor="rgba(244, 114, 182, 0.2)" />
                          <stop offset="100%" stopColor="rgba(249, 168, 212, 0.05)" />
                      </linearGradient>
                  </defs>
                  {/* ✅ ИСПРАВЛЕНИЕ 2: Привязываем Refs к SVG path */}
                  <path
                      ref={pathRef1}
                      fill="url(#waveGradient3)"
                      opacity="0.6"
                      shapeRendering="geometricPrecision"
                  />
                  <path
                      ref={pathRef2}
                      fill="url(#waveGradient2)"
                      opacity="0.7"
                      shapeRendering="geometricPrecision"
                  />
                  <path
                      ref={pathRef3}
                      fill="url(#waveGradient1)"
                      opacity="0.8"
                      shapeRendering="geometricPrecision"
                  />
              </svg>
          </div>

           {/* Sound level indicator */}
           {isRecording && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-1 z-20 pointer-events-none">
                {[...Array(5)].map((_, i) => (
                    <div
                    key={i}
                    // ✅ ИСПРАВЛЕНИЕ 3: Собираем Refs для прямого обновления стиля
                    ref={el => levelBarRefs.current[i] = el}
                    className="w-1 bg-cyan-400 rounded-full transition-none" // Убираем transition! Обновление в RAF должно быть мгновенным
                    style={{
                        height: '8px', 
                        transformOrigin: 'bottom',
                        // Начальные значения, которые будут перезаписаны в RAF
                        transform: 'scaleY(1)',
                        opacity: 0.3
                    }}
                    />
                ))}
            </div>
           )}
      </motion.div>
  );
};