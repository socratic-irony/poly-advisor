import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SettingsModal from './SettingsModal';

describe('SettingsModal', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    apiKey: 'test-key',
    onApiKeyChange: vi.fn(),
    onSaveKey: vi.fn(),
    onForgetKey: vi.fn(),
    searchDepth: 'medium' as const,
    onSearchDepthChange: vi.fn(),
    forceSearch: true,
    onForceSearchChange: vi.fn(),
    model: 'gpt-5.6-luna',
    onModelChange: vi.fn(),
    storageError: null as string | null,
  };

  it('saves and closes when API key is provided', () => {
    const onClose = vi.fn();
    const onSaveKey = vi.fn();
    render(<SettingsModal {...baseProps} onClose={onClose} onSaveKey={onSaveKey} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onSaveKey).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('does not save or close without API key', () => {
    const onClose = vi.fn();
    const onSaveKey = vi.fn();
    render(<SettingsModal {...baseProps} apiKey="" onClose={onClose} onSaveKey={onSaveKey} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onSaveKey).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without saving when clicking outside the modal', () => {
    const onClose = vi.fn();
    const onSaveKey = vi.fn();
    render(<SettingsModal {...baseProps} onClose={onClose} onSaveKey={onSaveKey} />);
    fireEvent.click(screen.getByTestId('settings-overlay'));
    expect(onClose).toHaveBeenCalled();
    expect(onSaveKey).not.toHaveBeenCalled();
  });
});
