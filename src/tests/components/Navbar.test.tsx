import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import Navbar from '@/components/Navbar';

describe('Navbar Component', () => {
  const mockCallbacks = {
    onContactClick: vi.fn(),
    onLibraryClick: vi.fn(),
    onFinanceClick: vi.fn(),
    onFirmClick: vi.fn(),
  };

  it('renders navbar with all navigation buttons', () => {
    render(<Navbar {...mockCallbacks} />);
    
    expect(screen.getByRole('banner')).toBeTruthy();
  });

  it('calls appropriate callback when library button clicked', () => {
    render(<Navbar {...mockCallbacks} />);
    
    const libraryButton = screen.getByRole('button', { name: /مكتبة|library/i });
    libraryButton.click();
    
    expect(mockCallbacks.onLibraryClick).toHaveBeenCalled();
  });

  it('calls appropriate callback when finance button clicked', () => {
    render(<Navbar {...mockCallbacks} />);
    
    const financeButton = screen.getByRole('button', { name: /مالية|finance/i });
    financeButton.click();
    
    expect(mockCallbacks.onFinanceClick).toHaveBeenCalled();
  });

  it('has RTL direction for Arabic content', () => {
    const { container } = render(<Navbar {...mockCallbacks} />);
    
    expect(container.dir).toBe('rtl');
  });
});
