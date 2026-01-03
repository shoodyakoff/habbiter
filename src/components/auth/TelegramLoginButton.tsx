'use client';

import React, { useEffect, useRef, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  botUsername: string;
  onAuth: (user: TelegramUser) => void;
  onLoad?: () => void;
  onError?: () => void;
}

export const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
  botUsername,
  onAuth,
  onLoad,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!botUsername) {
      setError('Bot username missing');
      return;
    }

    // Ensure bot username doesn't have @
    const cleanBotUsername = botUsername.replace('@', '');

    // Create a unique global callback function
    const callbackName = `telegramLoginCallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // @ts-ignore
    window[callbackName] = (user: TelegramUser) => {
      console.log('[TelegramWidget] Auth callback triggered', user);
      onAuth(user);
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', cleanBotUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    // script.setAttribute('data-auth-url', authUrl); // Removed in favor of onauth
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    script.onload = () => {
      console.log('[TelegramWidget] Script loaded successfully');
      onLoad?.();
    };

    script.onerror = () => {
      console.error('[TelegramWidget] Failed to load script');
      setError('Failed to load Telegram script');
      onError?.();
    };

    const container = containerRef.current;
    if (container) {
      container.innerHTML = ''; // Clear previous content
      container.appendChild(script);
      console.log('[TelegramWidget] Script appended to container', {
        bot: cleanBotUsername,
        callback: callbackName,
      });
    }

    return () => {
      if (container) {
        container.innerHTML = '';
      }
      // Cleanup global function
      // @ts-ignore
      delete window[callbackName];
    };
  }, [botUsername, onAuth, onLoad, onError]);

  if (error) {
    return (
      <div className="text-red-500 text-sm p-4 bg-red-50 rounded-lg border border-red-100">
        <p className="font-bold">Widget Error</p>
        <p>{error}</p>
        <p className="text-xs mt-2 text-gray-500 font-mono">
           Bot: {botUsername || 'MISSING'}
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center min-h-[40px] w-full" 
      data-testid="telegram-login-wrapper"
    />
  );
};
