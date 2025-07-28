import { useState } from 'react';
import { Settings, ChevronDown } from 'lucide-react';

interface SettingsProps {
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

export default function SettingsComponent({
  apiKey, onApiKeyChange, onSaveKey, onForgetKey,
  searchDepth, onSearchDepthChange,
  forceSearch, onForceSearchChange,
  model, onModelChange
}: SettingsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(true);

  return (
    <div className="cal-poly-card p-4 sm:p-6 rounded-xl cal-poly-shadow-lg mb-4">
      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-cal-poly-primary" />
          <h2 className="text-xl font-semibold text-cal-poly-primary">Settings</h2>
        </div>
        <ChevronDown className={`w-6 h-6 text-cal-poly-gray transition-transform duration-300 ${isSettingsOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isSettingsOpen && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="Paste your OpenAI API key"
              className="flex-1 min-w-0 px-4 py-3 input-cal-poly rounded-lg focus:outline-none text-sm"
              aria-label="OpenAI API key"
            />
            <button
              onClick={onSaveKey}
              className="px-6 py-3 btn-cal-poly-primary rounded-lg font-medium text-sm"
            >
              Save
            </button>
            <button
              onClick={onForgetKey}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm transition-all duration-300 hover:transform hover:-translate-y-0.5"
            >
              Forget
            </button>
          </div>
      
          {/* Settings Row */}
          <div className="flex flex-wrap gap-6 items-center text-sm">
            <div className="flex gap-4">
              <label className="flex items-center text-cal-poly-gray hover:text-cal-poly-primary cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="depth"
                  value="medium"
                  checked={searchDepth === 'medium'}
                  onChange={(e) => onSearchDepthChange(e.target.value as 'medium')}
                  className="mr-2 accent-green-600"
                />
                <span className="font-medium">Medium search</span>
              </label>
              <label className="flex items-center text-cal-poly-gray hover:text-cal-poly-primary cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="depth"
                  value="high"
                  checked={searchDepth === 'high'}
                  onChange={(e) => onSearchDepthChange(e.target.value as 'high')}
                  className="mr-2 accent-green-600"
                />
                <span className="font-medium">High search</span>
              </label>
            </div>
        
            <label className="flex items-center text-cal-poly-gray hover:text-cal-poly-primary cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={forceSearch}
                onChange={(e) => onForceSearchChange(e.target.checked)}
                className="mr-2 accent-green-600"
              />
              <span className="font-medium">Force web search</span>
            </label>
        
            <div className="flex items-center gap-2">
              <label htmlFor="model-select" className="font-medium text-cal-poly-gray">LLM model:</label>
              <select
                id="model-select"
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="px-3 py-2 input-cal-poly rounded-lg text-sm font-medium"
              >
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </div>
          </div>
      
          <div className="mt-3 flex items-center text-xs text-cal-poly-gray">
            <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your key stays secure in this browser. Never commit it to code.
          </div>
        </div>
      )}
    </div>
  );
}
