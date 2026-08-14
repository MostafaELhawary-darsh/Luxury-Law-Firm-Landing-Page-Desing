import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import Hero from '@/components/Hero';

describe('Hero Component', () => {
  it('renders hero section with main title', () => {
    const mockOnContactClick = vi.fn();
    render(<Hero onContactClick={mockOnContactClick} />);
    
    // Check if hero section is rendered
    const heroSection = screen.getByRole('region');
    expect(heroSection).toBeTruthy();
  });

  it('calls onContactClick when contact button is clicked', () => {
    const mockOnContactClick = vi.fn();
    render(<Hero onContactClick={mockOnContactClick} />);
    
    const contactButton = screen.getByRole('button', { name: /تواصل|contact/i });
    contactButton.click();
    
    expect(mockOnContactClick).toHaveBeenCalled();
  });

  it('renders with proper styling classes', () => {
    const mockOnContactClick = vi.fn();
    const { container } = render(<Hero onContactClick={mockOnContactClick} />);
    
    expect(container.querySelector('.bg-midnight')).toBeTruthy();
  });
});
