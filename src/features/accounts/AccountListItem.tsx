import React from 'react';
import { formatMoney } from '../../utils/formatMoney';
import { useLocalization } from '../../core/context/LocalizationContext';
import { motion } from 'framer-motion';
import { Account } from '../../core/types';
import { MoreHorizontal } from 'lucide-react';

interface AccountListItemProps {
  account: Account & { balance: number };
  onOpenActions: () => void;
  isSelected?: boolean;
  onClick?: () => void;
}

export const AccountListItem: React.FC<AccountListItemProps> = ({ account, isSelected, onClick, onOpenActions }) => {
  const { language } = useLocalization();
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const formattedBalance = formatMoney(account.balance, account.currency, locale);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className={`relative w-full h-48 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between overflow-hidden bg-gradient-to-br ${account.gradient}`}
    >
      <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full" />
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold">{account.name}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenActions();
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Account actions"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm opacity-80 capitalize">{account.type.toLowerCase()}</p>
      </div>

      <div className="relative z-10 text-right">
        <p className="text-3xl font-semibold">{formattedBalance}</p>
        <p className="text-sm opacity-80">Current Balance</p>
      </div>
    </motion.div>
  );
};