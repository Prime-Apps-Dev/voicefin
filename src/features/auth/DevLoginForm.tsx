// src/components/DevLoginForm.tsx

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLocalization } from '../../core/context/LocalizationContext';

interface DevLoginFormProps {
  onSubmit: (email: string, pass: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

export const DevLoginForm: React.FC<DevLoginFormProps> = ({ onSubmit, error, isLoading }) => {
  const [email, setEmail] = useState('test@example.com'); 
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { t } = useLocalization();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 bg-gray-800 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-center text-white mb-2">
          VoiceFin
        </h1>
        <p className="text-center text-brand-purple mb-6 text-sm font-medium">
          {t('devLoginTitle')}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-400 block mb-2" htmlFor="email">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-purple"
              placeholder="user@supabase.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 block mb-2" htmlFor="password">
              {t('password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-purple"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-green text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            ) : (
              t('login')
            )}
          </button>
        </form>
      </div>
    </div>
  );
};