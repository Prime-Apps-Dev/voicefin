import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { User } from '../types';
import {
    Target, Wallet, Handshake, Banknote, CalendarDays, CreditCard, LayoutGrid, Settings, ChevronRight
} from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';

interface ProfileScreenProps {
    user: User;
    daysActive: number;
    onNavigate: (screen: 'home' | 'savings' | 'profile' | 'accounts' | 'budgetPlanning' | 'categories' | 'settings' | 'comingSoon' | 'history') => void;
}

// Animation Variants
const whileTap = { scale: 0.95 };
const spring = { type: "spring", stiffness: 300, damping: 30 };
const zoomInOut = {
  initial: { scale: 0.95, opacity: 0 },
  whileInView: { scale: 1, opacity: 1, transition: { duration: 0.5, ease: [0.42, 0, 0.58, 1] } }
};


const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
};

export const ProfileScreen: React.FC<ProfileScreenProps> = (props) => {
    const { t } = useLocalization();
    const {
        user, daysActive,
        onNavigate
    } = props;
    
    const scrollRef = useRef(null);
    const { scrollYProgress } = useScroll({
      container: scrollRef,
    });
    
    // Animate the header content as the user scrolls
    const headerContentOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const headerContentScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.9]);
    const headerContentY = useTransform(scrollYProgress, [0, 0.15], [0, 20]);
        
    const userAvatar = user.name.charAt(0).toUpperCase();
    const avatarColor = stringToColor(user.name);
    
    return (
        <div ref={scrollRef} className="h-screen overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-800 pb-32 scrollbar-hide">
            {/* Sticky header container: Установлен bg-gray-800, чтобы цвет совпадал с отступом TG в App.tsx */}
            {/* Высота уменьшена, чтобы соответствовать новому дизайну без карточки */}
            <div className="sticky top-0 h-[180px] bg-gradient-to-b from-gray-900 to-gray-800 z-0 flex items-center justify-center px-6">
                <motion.div
                    className="w-full max-w-md"
                    style={{
                        opacity: headerContentOpacity,
                        scale: headerContentScale,
                        y: headerContentY,
                    }}
                >
                    {/* 1. Блок информации о пользователе - ПОЛНОШИРИННЫЙ, БЕЗ КАРТОЧКИ */}
                    {/* Используем p-4 для внутреннего отступа, чтобы соответствовать кнопкам ниже */}
                    <div className="flex items-center p-4">
                        {/* Аватар: Исправлен на квадратный, фиксированный размер, скругленные углы */}
                        <div
                            className="w-16 h-16 flex-shrink-0 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mr-4"
                            style={{ backgroundColor: avatarColor }}
                        >
                            {userAvatar}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-xl leading-5 font-bold text-gray-100 truncate">{user.name}</h1>
                                <p className="text-sm text-gray-400 truncate">{user.email}</p>
                            </div>
                            <div className="flex items-center text-xs text-gray-400 mt-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                                {t('activeDays', { days: daysActive })}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Content that scrolls over the header */}
            <div className="relative z-10 bg-gray-900 rounded-t-3xl -mt-8">
              <div className="px-6 py-6 space-y-6">
                  <div className="space-y-4">
                      <h2 className="text-xl font-semibold text-gray-100 px-2">{t('financialManagement')}</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <motion.button onClick={() => onNavigate('comingSoon')} className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-700 rounded-3xl p-6 text-white shadow-lg text-left w-full" variants={zoomInOut} whileInView="whileInView" viewport={{ once: true, amount: 0.2 }}>
                             <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                             <div className="relative z-10"><div className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm inline-block"><Target className="w-6 h-6" /></div><h3 className="font-semibold mt-2">{t('financialGoals')}</h3><p className="text-sm opacity-80">{t('planFuture')}</p></div>
                          </motion.button>
                           <motion.button onClick={() => onNavigate('budgetPlanning')} className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-6 text-white shadow-lg text-left w-full" variants={zoomInOut} whileInView="whileInView" viewport={{ once: true, amount: 0.2 }}>
                             <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                             <div className="relative z-10"><div className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm inline-block"><Wallet className="w-6 h-6" /></div><h3 className="font-semibold mt-2">{t('budgetPlanning')}</h3><p className="text-sm opacity-80">{t('controlSpending')}</p></div>
                          </motion.button>
                      </div>
                       <motion.button onClick={() => onNavigate('comingSoon')} className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 text-white shadow-lg text-left w-full" variants={zoomInOut} whileInView="whileInView" viewport={{ once: true, amount: 0.2 }}>
                         <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                         <div className="relative z-10"><div className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm inline-block"><Handshake className="w-6 h-6" /></div><h3 className="font-semibold mt-2">{t('debts')}</h3><p className="text-sm opacity-80">{t('manageLiabilities')}</p></div>
                      </motion.button>
                  </div>

                  <div className="space-y-4">
                      <h2 className="text-xl font-semibold text-gray-100 px-2">{t('myData')}</h2>
                      <div className="space-y-3">
                          <motion.button onClick={() => onNavigate('comingSoon')} className="w-full bg-gray-800 p-4 rounded-2xl border border-gray-700 flex items-center justify-between hover:bg-gray-700/50 transition-colors" whileTap={whileTap} whileHover={{ x: 5 }} transition={spring} variants={zoomInOut} whileInView="whileInView" viewport={{ once: true, amount: 0.2 }}>
                              <div className="flex items-center"><div className="w-10 h-10 bg-purple-900/30 rounded-2xl flex items-center justify-center mr-3"><Banknote className="w-5 h-5 text-purple-400" /></div><div className="text-left"><div className="font-medium leading-5 text-gray-100">{t('depositsCredits')}</div><div className="text-sm text-gray-400">{t('comingSoon')}</div></div></div><ChevronRight className="w-5 h-5 text-gray-400" />
                          </motion.button>
                          <motion.button onClick={() => onNavigate('history')} className="w-full bg-gray-800 p-4 rounded-2xl border border-gray-700 flex items-center justify-between hover:bg-gray-700/50 transition-colors" whileTap={whileTap} whileHover={{ x: 5 }} transition={spring} variants={zoomInOut} whileInView="whileInView" viewport={{ once: true, amount: 0.2 }}>
                              <div className="flex items-center"><div className="w-10 h-10 bg-green-900/30 rounded-2xl flex items-center justify-center mr-3"><CalendarDays className="w-5 h-5 text-green-400" /></div><div className="text-left"><div className="font-medium leading-5 text-gray-100">{t('transactionsHistory')}</div><div className="text-sm text-gray-400">{t('allOperations')}</div></div></div><ChevronRight className="w-5 h-5 text-gray-400" />
                          </motion.button>
                          <motion.button onClick={() => onNavigate('accounts')} className="w-full bg-gray-800 p-4 rounded-2xl border border-gray-700 flex items-center justify-between hover:bg-gray-700/50 transition-colors" whileTap={whileTap} whileHover={{ x: 5 }} transition={spring} variants={zoomInOut} whileInView="whileInView" viewport={{ once: true, amount: 0.2 }}>
                              <div className="flex items-center"><div className="w-10 h-10 bg-blue-900/30 rounded-2xl flex items-center justify-center mr-3"><CreditCard className="w-5 h-5 text-blue-400" /></div><div className="text-left"><div className="font-medium leading-5 text-gray-100">{t('accounts')}</div><div className="text-sm text-gray-400">{t('accountsManagement')}</div></div></div><ChevronRight className="w-5 h-5 text-gray-400" />
                          </motion.button>
                          <motion.button onClick={() => onNavigate('categories')} className="w-full bg-gray-800 p-4 rounded-2xl border border-gray-700 flex items-center justify-between hover:bg-gray-700/50 transition-colors" whileTap={whileTap} whileHover={{ x: 5 }} transition={spring} variants={zoomInOut} whileInView="whileInView" viewport={{ once: true, amount: 0.2 }}>
                              <div className="flex items-center"><div className="w-10 h-10 bg-orange-900/30 rounded-2xl flex items-center justify-center mr-3"><LayoutGrid className="w-5 h-5 text-orange-400" /></div><div className="text-left"><div className="font-medium leading-5 text-gray-100">{t('categories')}</div><div className="text-sm text-gray-400">{t('categoriesManagement')}</div></div></div><ChevronRight className="w-5 h-5 text-gray-400" />
                          </motion.button>
                          <motion.button onClick={() => onNavigate('settings')} className="w-full bg-gray-800 p-4 rounded-2xl border border-gray-700 flex items-center justify-between hover:bg-gray-700/50 transition-colors" whileTap={whileTap} whileHover={{ x: 5 }} transition={spring} variants={zoomInOut} whileInView="whileInView" viewport={{ once: true, amount: 0.2 }}>
                              <div className="flex items-center"><div className="w-10 h-10 bg-gray-700 rounded-2xl flex items-center justify-center mr-3"><Settings className="w-5 h-5 text-gray-400" /></div><div className="text-left"><div className="font-medium leading-5 text-gray-100">{t('settings')}</div><div className="text-sm text-gray-400">{t('personalizationAndSecurity')}</div></div></div><ChevronRight className="w-5 h-5 text-gray-400" />
                          </motion.button>
                      </div>
                  </div>
              </div>
            </div>
        </div>
    );
};