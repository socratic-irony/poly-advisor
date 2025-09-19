import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect, vi } from 'vitest';

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { name: /Poly Advisor/i });
    expect(heading).toBeInTheDocument();
  });

  it('handles button click and Enter key press identically', () => {
    // Mock console.error to suppress expected API key errors during testing
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<App />);
    
    const textarea = screen.getByPlaceholderText(/Ask a Cal Poly question/i);
    const askButton = screen.getByText('Ask Poly Advisor');
    
    // Test button click
    fireEvent.change(textarea, { target: { value: 'Test question via button' } });
    fireEvent.click(askButton);
    
    // Should see the message in the chat (user message should be displayed)
    expect(screen.getByText('Test question via button')).toBeInTheDocument();
    
    // Test Enter key press
    fireEvent.change(textarea, { target: { value: 'Test question via Enter' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    
    // Should see both messages in the chat
    expect(screen.getByText('Test question via Enter')).toBeInTheDocument();
    
    // Restore console.error
    mockConsoleError.mockRestore();
  });
});
