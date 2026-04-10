import { useState, useEffect } from 'react';

export function useSettings() {
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('gpt-5.4-mini');
  const [searchDepth, setSearchDepth] = useState<'medium' | 'high'>('medium');
  const [forceSearch, setForceSearch] = useState<boolean>(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedKey = window.localStorage?.getItem('openai_key');
      if (savedKey) {
        setApiKey(savedKey);
      }
      setStorageError(null);
    } catch (error) {
      console.error('Unable to access localStorage', error);
      setStorageError(
        'Browser storage is unavailable. Your API key will only be kept for this session.'
      );
    }
  }, []);

  const saveKey = () => {
    const trimmedKey = apiKey.trim();
    setApiKey(trimmedKey);

    try {
      window.localStorage?.setItem('openai_key', trimmedKey);
      setStorageError(null);
    } catch (error) {
      console.error('Unable to save key to localStorage', error);
      setStorageError(
        'We could not save your API key to browser storage. It will reset when you close this tab.'
      );
    }
  };

  const forgetKey = () => {
    setApiKey('');

    try {
      window.localStorage?.removeItem('openai_key');
      setStorageError(null);
    } catch (error) {
      console.error('Unable to remove key from localStorage', error);
      setStorageError('We could not remove the stored API key.');
    }
  };

  return {
    apiKey,
    setApiKey,
    model,
    setModel,
    searchDepth,
    setSearchDepth,
    forceSearch,
    setForceSearch,
    saveKey,
    forgetKey,
    storageError,
  };
}
