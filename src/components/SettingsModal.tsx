import { X } from 'lucide-react';
import Settings from './Settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onSaveKey: () => void;
  onForgetKey: () => void;
  searchDepth: 'medium' | 'high';
  onSearchDepthChange: (value: 'medium' | 'high') => void;
  forceSearch: boolean;
  onForceSearchChange: (value: boolean) => void;
  model: string;
  onModelChange: (value: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onApiKeyChange,
  onSaveKey,
  onForgetKey,
  searchDepth,
  onSearchDepthChange,
  forceSearch,
  onForceSearchChange,
  model,
  onModelChange,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleSaveKey = () => {
    if (!apiKey.trim()) return;
    onSaveKey();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      data-testid="settings-overlay"
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-cal-poly-primary">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close settings"
          >
              <X className="w-5 h-5 text-cal-poly-gray" />
          </button>
        </div>
        
        <div className="p-4">
          <Settings
            apiKey={apiKey}
            onApiKeyChange={onApiKeyChange}
            onSaveKey={handleSaveKey}
            onForgetKey={onForgetKey}
            searchDepth={searchDepth}
            onSearchDepthChange={onSearchDepthChange}
            forceSearch={forceSearch}
            onForceSearchChange={onForceSearchChange}
            model={model}
            onModelChange={onModelChange}
          />
        </div>
      </div>
    </div>
  );
}