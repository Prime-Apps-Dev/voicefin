import React from 'react';
import { Account } from '../types';

interface AccountCardProps {
  account: Account;
  balance: number;
  isActive: boolean;
  onClick: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, balance, isActive, onClick }) => {
  const formattedBalance = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: account.currency,
  }).format(balance);

  return (
    <div
      onClick={onClick}
      className={`
        flex-shrink-0 w-64 h-36 p-4 rounded-xl shadow-lg
        flex flex-col justify-between cursor-pointer
        transition-all duration-300 transform
        bg-gradient-to-br ${account.gradient}
        ${isActive ? 'ring-4 ring-brand-green scale-105' : 'ring-2 ring-transparent hover:scale-105'}
      `}
    >
      <div>
        <p className="font-semibold text-white text-lg">{account.name}</p>
        <p className="text-white text-xs opacity-80">{account.type}</p>
      </div>
      <div>
        <p className="text-white text-xs opacity-80">Balance</p>
        <p className="font-bold text-white text-2xl">{formattedBalance}</p>
      </div>
    </div>
  );
};
