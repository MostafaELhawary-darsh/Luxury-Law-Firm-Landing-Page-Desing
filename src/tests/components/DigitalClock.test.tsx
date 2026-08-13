import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../utils/test-utils';
import DigitalClock from '@/components/clock/DigitalClock';

describe('DigitalClock Component', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Mock timer
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders clock with title', () => {
    render(<DigitalClock />);
    expect(screen.getByText('World Clock')).toBeTruthy();
  });

  it('displays default timezones', () => {
    render(<DigitalClock />);
    expect(screen.getByText('London')).toBeTruthy();
    expect(screen.getByText('New York')).toBeTruthy();
  });

  it('shows add timezone button', () => {
    render(<DigitalClock />);
    const addButton = screen.getByRole('button', { name: /add time zone/i });
    expect(addButton).toBeTruthy();
  });

  it('displays format toggle buttons', () => {
    render(<DigitalClock />);
    expect(screen.getByText('24H')).toBeTruthy();
    expect(screen.getByText('Show Sec')).toBeTruthy();
    expect(screen.getByText('Show Date')).toBeTruthy();
  });

  it('toggles 24/12 hour format', async () => {
    render(<DigitalClock />);
    const formatButton = screen.getByText('24H');
    fireEvent.click(formatButton);
    await waitFor(() => {
      expect(screen.getByText('12H')).toBeTruthy();
    });
  });

  it('toggles seconds display', async () => {
    render(<DigitalClock />);
    const secondsButton = screen.getByText('Show Sec');
    fireEvent.click(secondsButton);
    await waitFor(() => {
      expect(screen.getByText('Hide Sec')).toBeTruthy();
    });
  });

  it('toggles dark mode', async () => {
    const { container } = render(<DigitalClock />);
    const darkModeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(darkModeButton);
    await waitFor(() => {
      const main = container.querySelector('main');
      expect(main?.className).toContain('bg-gradient-to-br');
    });
  });

  it('opens add timezone modal', async () => {
    render(<DigitalClock />);
    const addButton = screen.getByRole('button', { name: /add time zone/i });
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText('Add Time Zone')).toBeTruthy();
    });
  });

  it('saves timezone to localStorage', () => {
    render(<DigitalClock />);
    const stored = localStorage.getItem('timeZones');
    expect(stored).toBeTruthy();
  });

  it('saves settings to localStorage', () => {
    render(<DigitalClock />);
    const stored = localStorage.getItem('clockSettings');
    expect(stored).toBeTruthy();
  });
});
