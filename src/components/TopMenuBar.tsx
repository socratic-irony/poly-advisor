import { Settings } from 'lucide-react';

interface TopMenuBarProps {
  onSettingsClick: () => void;
}

export default function TopMenuBar({ onSettingsClick }: TopMenuBarProps) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-white border-b border-gray-200 md:hidden">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-cal-poly-primary">🎓 Poly Advisor</span>
      </div>
      
      <button
        onClick={onSettingsClick}
        className="flex items-center gap-2 px-3 py-2 text-cal-poly-gray hover:text-cal-poly-primary hover:bg-gray-50 rounded-lg transition-colors"
        aria-label="Open settings"
      >
        <Settings className="w-5 h-5" />
        <span className="text-sm font-medium">Settings</span>
      </button>
    </div>
  );
}