// src/features/onboarding/OnboardingGuide.tsx

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalization } from '../../core/context/LocalizationContext';
import { Mic, Type, Wallet, LayoutGrid, PartyPopper, ArrowRight, CheckCircle, Loader2, X } from 'lucide-react';
import * as api from '../../core/services/api';
import { DebtType, DebtStatus } from '../../core/types';

interface OnboardingGuideProps {
    onFinish: () => void;
    initialDebtId: string | null;
    onDebtActionComplete: (debtId: string | null) => void;
}

const steps = [
    {
        titleKey: 'onboardingWelcomeTitle',
        textKey: 'onboardingWelcomeText',
        icon: PartyPopper,
    },
    {
        titleKey: 'onboardingVoiceTitle',
        textKey: 'onboardingVoiceText',
        icon: Mic,
    },
    {
        titleKey: 'onboardingTextTitle',
        textKey: 'onboardingTextText',
        icon: Type,
    },
    {
        titleKey: 'onboardingAccountsTitle',
        textKey: 'onboardingAccountsText',
        icon: Wallet,
    },
    {
        titleKey: 'onboardingBudgetsTitle',
        textKey: 'onboardingBudgetsText',
        icon: LayoutGrid,
    },
    {
        titleKey: 'onboardingFinishTitle',
        textKey: 'onboardingFinishText',
        icon: PartyPopper,
    },
];

interface DebtOnboardingStepProps {
    debtId: string;
    onComplete: () => void;
    onDebtActionComplete: (debtId: string | null) => void;
}

const DebtOnboardingStep: React.FC<DebtOnboardingStepProps> = ({ debtId, onComplete, onDebtActionComplete }) => {
    const { t } = useLocalization();
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sharedDebt, setSharedDebt] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>('pending');

    useEffect(() => {
        const loadDebt = async () => {
            try {
                setIsLoading(true);
                const data = await api.getSharedDebt(debtId);
                if (!data) {
                    setError('Долг не найден или был удален. Вы можете продолжить онбординг.');
                } else {
                    setSharedDebt(data);
                }
            } catch (err: any) {
                setError(err.message || 'Не удалось загрузить данные. Вы можете продолжить онбординг.');
            } finally {
                setIsLoading(false);
            }
        };
        loadDebt();
    }, [debtId]);

    const handleAccept = async () => {
        if (!sharedDebt || isProcessing || status !== 'pending') return;

        try {
            setIsProcessing(true);

            const myType = sharedDebt.type === DebtType.I_OWE
                ? DebtType.OWED_TO_ME
                : DebtType.I_OWE;

            const newDebt = await api.addDebt({
                person: sharedDebt.owner_name || 'Друг',
                amount: sharedDebt.amount,
                current_amount: sharedDebt.amount,
                currency: sharedDebt.currency,
                type: myType,
                date: new Date().toISOString(),
                description: `Синхронизировано: ${sharedDebt.description || ''}`,
                status: DebtStatus.ACTIVE,
                // @ts-ignore
                parent_debt_id: sharedDebt.id
            });

            await api.linkDebtPartners(sharedDebt.id, newDebt.id);

            setStatus('accepted');
            setError(null);
            onDebtActionComplete(null);
        } catch (err) {
            console.error(err);
            setError('Ошибка при сохранении долга. Попробуйте пропустить и добавить позже.');
            setStatus('pending');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecline = () => {
        setStatus('declined');
        setError(null);
        onDebtActionComplete(null);
    };

    const isInteractionDisabled = isProcessing || status !== 'pending';
    const hasFinishedInteraction = status === 'accepted' || status === 'declined' || (error && !isLoading);

    return (
        <div className="w-full h-full flex flex-col items-center justify-start text-center p-8 overflow-y-auto">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                <ArrowRight className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
                {isLoading ? 'Загрузка данных о долге' :
                    sharedDebt ? 'Входящий долг' : 'Проблема с долгом'}
            </h2>

            {isLoading && (
                <div className="py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                </div>
            )}

            {!isLoading && hasFinishedInteraction && (
                <div className="text-center w-full py-4 space-y-3">
                    {status === 'accepted' && (
                        <>
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                            <p className="font-semibold text-green-400">Долг принят и синхронизирован.</p>
                        </>
                    )}
                    {status === 'declined' && (
                        <>
                            <X className="w-8 h-8 mx-auto mb-2 text-red-500" />
                            <p className="font-semibold text-red-400">Долг отклонен.</p>
                        </>
                    )}
                    {error && (
                        <>
                            <p className="text-red-400 leading-relaxed font-medium">{error}</p>
                        </>
                    )}
                </div>
            )}

            {!isLoading && !hasFinishedInteraction && sharedDebt && (
                <div className="w-full space-y-4">
                    <p className="text-zinc-400 leading-relaxed">
                        Пользователь <span className="font-semibold text-white">{sharedDebt.owner_name}</span> предлагает синхронизировать долг:
                    </p>
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                        <div className="text-lg font-bold text-white mb-1">
                            {sharedDebt.amount} <span className="text-sm text-zinc-400">{sharedDebt.currency}</span>
                        </div>
                        <div className="text-xs text-zinc-300">
                            {sharedDebt.type === DebtType.I_OWE
                                ? 'Он должен вам'
                                : 'Вы должны ему'}
                            {sharedDebt.description && sharedDebt.description.trim() !== '' && ` (${sharedDebt.description})`}
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8 w-full flex flex-col gap-2">
                <button
                    onClick={handleAccept}
                    disabled={isInteractionDisabled || isLoading || !sharedDebt}
                    className={`w-full py-3.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 
                        ${status === 'accepted' ? 'bg-green-600/50 text-green-300 cursor-default' :
                            isInteractionDisabled || isLoading || !sharedDebt ? 'bg-blue-600/50 text-blue-300 opacity-50 cursor-not-allowed' :
                                'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'}`}
                >
                    {isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : status === 'accepted' ? (
                        <>
                            <CheckCircle className="w-5 h-5" />
                            Добавлено
                        </>
                    ) : (
                        'Принять'
                    )}
                </button>
                <button
                    onClick={handleDecline}
                    disabled={isProcessing || status !== 'pending' || isLoading || !sharedDebt}
                    className={`w-full py-3.5 rounded-xl font-bold transition-all active:scale-95 
                        ${status === 'declined' ? 'bg-zinc-700/50 text-zinc-400 cursor-default' :
                            'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
                >
                    {status === 'declined' ? 'Отклонено' : 'Отклонить'}
                </button>
            </div>

            {hasFinishedInteraction && (
                <button
                    onClick={onComplete}
                    className="mt-4 text-sm font-medium text-brand-green hover:text-green-400"
                >
                    Продолжить онбординг <ArrowRight className="inline w-4 h-4 ml-1" />
                </button>
            )}
        </div>
    );
};

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onFinish, initialDebtId, onDebtActionComplete }) => {
    const { t } = useLocalization();
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);

    const hasDebtStep = !!initialDebtId;
    const debtStepIndex = 0;

    const effectiveSteps = hasDebtStep
        ? [{ titleKey: 'onboardingDebtTitle', textKey: 'onboardingDebtText', icon: ArrowRight }, ...steps]
        : steps;

    const paginate = (newDirection: number) => {
        setDirection(newDirection);
        setCurrentStep(prev => prev + newDirection);
    };

    const handleDebtComplete = () => {
        paginate(1);
    };

    const currentStepData = effectiveSteps[currentStep];
    const IconComponent = currentStepData.icon;

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9
        })
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-[9999] flex items-center justify-center px-4 py-[88px]">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-zinc-800/60"
            >
                <div className="absolute top-4 right-4 z-20">
                    <button
                        onClick={onFinish}
                        className="text-zinc-500 hover:text-white text-sm font-medium px-3 py-1 rounded-full hover:bg-zinc-800 transition-colors"
                    >
                        {t('skip')}
                    </button>
                </div>

                <div className="flex-grow relative flex items-center justify-center">
                    <AnimatePresence initial={false} custom={direction}>
                        {hasDebtStep && currentStep === debtStepIndex ? (
                            <motion.div
                                key="debt-step"
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{
                                    x: { type: "spring", stiffness: 300, damping: 30 },
                                    opacity: { duration: 0.2 }
                                }}
                                className="absolute w-full h-full"
                            >
                                <DebtOnboardingStep
                                    debtId={initialDebtId!}
                                    onComplete={handleDebtComplete}
                                    onDebtActionComplete={onDebtActionComplete}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key={currentStep}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{
                                    x: { type: "spring", stiffness: 300, damping: 30 },
                                    opacity: { duration: 0.2 }
                                }}
                                className="absolute w-full h-full flex flex-col items-center justify-center text-center p-8"
                            >
                                <div className="w-20 h-20 bg-brand-green/10 rounded-full flex items-center justify-center mb-6">
                                    <IconComponent className="w-10 h-10 text-brand-green" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-3">{t(currentStepData.titleKey)}</h2>
                                <p className="text-zinc-400 leading-relaxed">{t(currentStepData.textKey)}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {!(hasDebtStep && currentStep === debtStepIndex) && (
                    <div className="p-6 flex flex-col items-center gap-4 border-t border-zinc-800/60">
                        <div className="flex gap-2">
                            {effectiveSteps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-all ${currentStep === i ? 'bg-brand-green w-4' : 'bg-zinc-700'}`}
                                />
                            ))}
                        </div>

                        <div className="w-full flex justify-between items-center">
                            <button
                                onClick={() => paginate(-1)}
                                disabled={currentStep === 0}
                                className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {t('back')}
                            </button>
                            {currentStep < effectiveSteps.length - 1 ? (
                                <button
                                    onClick={() => paginate(1)}
                                    className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200"
                                >
                                    {t('next')}
                                </button>
                            ) : (
                                <button
                                    onClick={onFinish}
                                    className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200"
                                >
                                    {t('getStarted')}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>,
        document.body
    );
};