// src/utils/telegram-mock.ts

// Эта функция запускается только в режиме разработки (npm run dev)
if (import.meta.env.DEV) {
  console.log('DEV MODE: Injecting Telegram WebApp mock.');

  // Проверяем, чтобы не перезаписать объект, если он уже есть
  if (!(window as any).Telegram) {
    (window as any).Telegram = {};
  }

  (window as any).Telegram.WebApp = {
    // Данные initData нам не нужны, т.к. мы будем входить по email
    initData: '',
    
    // Поддельный пользователь для обратной совместимости
    initDataUnsafe: {
      user: {
        id: 999999,
        first_name: 'Dev',
        last_name: 'User',
        username: 'dev_user',
        language_code: 'ru',
        is_premium: true,
      },
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'dev_mock_hash'
    },
    
    // Пустые функции-заглушки, чтобы приложение не падало
    ready: () => {
      console.log('Mock tg.ready() called');
    },
    expand: () => {
      console.log('Mock tg.expand() called');
    },
    
    // Другие методы, которые могут понадобиться
    onEvent: (event: string, callback: () => void) => {
      console.log(`Mock tg.onEvent('${event}') registered`);
    },
    offEvent: (event: string, callback: () => void) => {
      console.log(`Mock tg.offEvent('${event}') registered`);
    },
    
    // Основные цвета Telegram
    themeParams: {
      bg_color: '#121212', // (gray-900)
      text_color: '#ffffff',
      hint_color: '#aaaaaa',
      link_color: '#8B5CF6', // (brand-purple)
      button_color: '#1DB954', // (brand-green)
      button_text_color: '#ffffff',
    },
    
    // Важные флаги
    isClosingConfirmationEnabled: false,
    MainButton: {
      isVisible: false,
      text: '',
      show: () => {},
      hide: () => {},
      setParams: (params: any) => {},
    },
    HapticFeedback: {
      impactOccurred: (style: string) => {
        console.log(`Mock HapticFeedback.impactOccurred('${style}')`);
      },
      notificationOccurred: (type: string) => {
        console.log(`Mock HapticFeedback.notificationOccurred('${type}')`);
      },
      selectionChanged: () => {
        console.log('Mock HapticFeedback.selectionChanged()');
      }
    }
  };
}