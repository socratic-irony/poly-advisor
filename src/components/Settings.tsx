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
    <div className="cal-poly-card p-3 sm:p-4 lg:p-6 rounded-xl cal-poly-shadow-lg mb-3 sm:mb-4">
      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-cal-poly-primary" />
          <h2 className="text-lg sm:text-xl font-semibold text-cal-poly-primary">Settings</h2>
        </div>
        <ChevronDown className={`w-5 h-5 sm:w-6 sm:h-6 text-cal-poly-gray transition-transform duration-300 ${isSettingsOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isSettingsOpen && (
        <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="Paste your OpenAI API key"
              className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 input-cal-poly rounded-lg focus:outline-none text-sm"
              aria-label="OpenAI API key"
            />
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={onSaveKey}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 btn-cal-poly-primary rounded-lg font-medium text-sm"
              >
                Save
              </button>
              <button
                onClick={onForgetKey}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm transition-all duration-300 hover:transform hover:-translate-y-0.5"
              >
                Forget
              </button>
            </div>
          </div>
      
          {/* Settings Row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-start sm:items-center text-sm">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
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
        
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
              <label htmlFor="model-select" className="font-medium text-cal-poly-gray text-xs sm:text-sm">LLM model:</label>
              <select
                id="model-select"
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full sm:w-auto px-2 sm:px-3 py-1.5 sm:py-2 input-cal-poly rounded-lg text-xs sm:text-sm font-medium"
              >
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </div>
          </div>
      
          <div className="mt-2 sm:mt-3 flex items-center text-xs text-cal-poly-gray">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your key stays secure in this browser. Never commit it to code.{' '}
            <a 
              href="https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-cal-poly-primary hover:text-green-600 underline transition-colors"
            >
              Get your API key here...
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
