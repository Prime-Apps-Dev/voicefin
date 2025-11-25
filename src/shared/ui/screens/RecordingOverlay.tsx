// src/components/RecordingOverlay.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Square } from 'lucide-react';
import { useLocalization } from '../../../core/context/LocalizationContext';

interface RecordingOverlayProps {
    transcription: string;
    stream: MediaStream | null;
    onStop: () => void;
    isRecording: boolean;
    audioContext: AudioContext | null;
}

const generateWavePath = (time: number, amplitude: number, frequency: number) => {
    // Эта функция остается, но теперь она будет вызываться только в V-Sync цикле (RAF)
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
    const [audioLevel, setAudioLevel] = useState(0);
    const [time, setTime] = useState(0);
    const animationFrameId = useRef<number>(0);
    const smoothedLevelRef = useRef(0);
    // 🚨 ИСПРАВЛЕНИЕ 1: Реф для отслеживания времени старта для более точного расчета
    const startTimeRef = useRef(performance.now());

    // ----------------------------------------------------------------
    // 🚨 ИСПРАВЛЕНИЕ 2: УДАЛЕН НЕЭФФЕКТИВНЫЙ useEffect С setInterval (ЛАГ)
    // ----------------------------------------------------------------

    useEffect(() => {
        if (!stream || !audioContext) {
            setAudioLevel(0);
            smoothedLevelRef.current = 0;
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            return;
        };

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 512;

        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateAudioLevel = (timestamp: number) => {
            // ----------------------------------------------------------------
            // 🚨 ИСПРАВЛЕНИЕ 3: Объединяем обновление 'time' и 'audioLevel' 
            // в один V-Sync-aligned цикл requestAnimationFrame.
            // ----------------------------------------------------------------
            const elapsed = (timestamp - startTimeRef.current) / 1000;
            setTime(elapsed * 2); // Обновляем time

            // Обновление уровня звука
            analyser.getByteFrequencyData(dataArray);

            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const normalized = Math.min(average / 128, 1);

            smoothedLevelRef.current += (normalized - smoothedLevelRef.current) * 0.15;
            setAudioLevel(smoothedLevelRef.current);

            animationFrameId.current = requestAnimationFrame(updateAudioLevel);
        };

        startTimeRef.current = performance.now(); // Сброс времени при запуске
        updateAudioLevel(startTimeRef.current);

        return () => {
            cancelAnimationFrame(animationFrameId.current);
            source.disconnect();
            analyser.disconnect();
            smoothedLevelRef.current = 0;
            setAudioLevel(0);
        };
    }, [stream, audioContext]);

    const words = useMemo(() => transcription.split(' ').filter(w => w !== ''), [transcription]);

    const currentAmplitude = 8 + audioLevel * 50;

    // Вычисления тяжелых путей SVG
    const wavePath1 = generateWavePath(time * 0.5, currentAmplitude * 0.6, 2);
    const wavePath2 = generateWavePath(time * 0.7, currentAmplitude * 0.8, 2.5);
    const wavePath3 = generateWavePath(time, currentAmplitude, 3);

    return ReactDOM.createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center overflow-hidden z-[9999]"
        >
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-3xl transition-all duration-1000"
                    style={{
                        background: `radial-gradient(circle, rgba(59, 130, 246, ${0.2 + audioLevel * 0.3}) 0%, rgba(236, 72, 153, ${0.1 + audioLevel * 0.2}) 50%, transparent 70%)`
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
                                    // 🚨 ИСПРАВЛЕНИЕ 4: Уменьшаем duration для меньшего 'залипания'
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
                                style={{ transform: `scale(${1 + audioLevel * 0.3})` }}
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
                    style={{ minWidth: '800px' }}
                    preserveAspectRatio="none"
                >
                    <defs>
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
                        {/* 🚨 ИСПРАВЛЕНИЕ 5: УДАЛЕНЫ ТЯЖЕЛЫЕ SVG BLUR ФИЛЬТРЫ */}
                    </defs>
                    <path
                        d={wavePath1}
                        fill="url(#waveGradient3)"
                        // 🚨 ИСПРАВЛЕНИЕ 6: Удален вызов фильтра
                        opacity="0.6"
                        shapeRendering="geometricPrecision"
                    />
                    <path
                        d={wavePath2}
                        fill="url(#waveGradient2)"
                        // 🚨 ИСПРАВЛЕНИЕ 6: Удален вызов фильтра
                        opacity="0.7"
                        shapeRendering="geometricPrecision"
                    />
                    <path
                        d={wavePath3}
                        fill="url(#waveGradient1)"
                        // 🚨 ИСПРАВЛЕНИЕ 6: Удален вызов фильтра
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
                            className="w-1 bg-cyan-400 rounded-full transition-all duration-150"
                            style={{
                                // 🚨 ИСПРАВЛЕНИЕ 7: Используем transform: scaleY вместо height 
                                // для аппаратного ускорения анимации индикаторов
                                height: '8px', // Базовая высота (например, 8px)
                                transform: `scaleY(${1 + (audioLevel > i * 0.2 ? audioLevel * 3 : 0)})`,
                                transformOrigin: 'bottom',
                                opacity: audioLevel > i * 0.2 ? 1 : 0.3
                            }}
                        />
                    ))}
                </div>
            )}
        </motion.div>,
        document.body
    );
};