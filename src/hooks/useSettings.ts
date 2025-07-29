import { useState, useEffect } from 'react';

export function useSettings() {
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('gpt-4.1');
  const [searchDepth, setSearchDepth] = useState<'medium' | 'high'>('medium');
  const [forceSearch, setForceSearch] = useState<boolean>(true);

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const saveKey = () => {
    const trimmedKey = apiKey.trim();
    localStorage.setItem('openai_key', trimmedKey);
    setApiKey(trimmedKey);
  };

  const forgetKey = () => {
    localStorage.removeItem('openai_key');
    setApiKey('');
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
  };
}
