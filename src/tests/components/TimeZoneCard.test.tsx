import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../utils/test-utils';
import TimeZoneCard from '@/components/clock/TimeZoneCard';
import type { TimeZone, ClockSettings } from '@/lib/clockTypes';

const mockTimeZone: TimeZone = {
  id: '1',
  name: 'London',
  timezone: 'Europe/London',
  offset: 0,
};

const mockSettings: ClockSettings = {
  format24h: true,
  showSeconds: true,
  showDate: true,
  isDarkMode: false,
};

describe('TimeZoneCard Component', () => {
  const mockOnRemove = vi.fn();
  const mockOnUpdate = vi.fn();
  const currentTime = new Date();

  it('renders timezone name', () => {
    render(
      <TimeZoneCard
        timeZone={mockTimeZone}
        currentTime={currentTime}
        settings={mockSettings}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        isDarkMode={false}
      />
    );
    expect(screen.getByText('London')).toBeTruthy();
  });

  it('displays time', () => {
    render(
      <TimeZoneCard
        timeZone={mockTimeZone}
        currentTime={currentTime}
        settings={mockSettings}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        isDarkMode={false}
      />
    );
    const timeDisplay = screen.getByText((content, element) => {
      return /\d{2}:\d{2}:\d{2}/.test(content);
    });
    expect(timeDisplay).toBeTruthy();
  });

  it('displays date when showDate is true', () => {
    render(
      <TimeZoneCard
        timeZone={mockTimeZone}
        currentTime={currentTime}
        settings={{ ...mockSettings, showDate: true }}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        isDarkMode={false}
      />
    );
    const dateElement = screen.getByText((content, element) => {
      return /\w{3},\s\w{3}\s\d+/.test(content);
    });
    expect(dateElement).toBeTruthy();
  });

  it('hides date when showDate is false', () => {
    render(
      <TimeZoneCard
        timeZone={mockTimeZone}
        currentTime={currentTime}
        settings={{ ...mockSettings, showDate: false }}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        isDarkMode={false}
      />
    );
    const dateElements = screen.queryAllByText((content, element) => {
      return /\w{3},\s\w{3}\s\d+/.test(content);
    });
    expect(dateElements.length).toBe(0);
  });

  it('calls onRemove when delete button clicked', () => {
    render(
      <TimeZoneCard
        timeZone={mockTimeZone}
        currentTime={currentTime}
        settings={mockSettings}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        isDarkMode={false}
      />
    );
    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);
    expect(mockOnRemove).toHaveBeenCalled();
  });

  it('enters edit mode when edit button clicked', () => {
    render(
      <TimeZoneCard
        timeZone={mockTimeZone}
        currentTime={currentTime}
        settings={mockSettings}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        isDarkMode={false}
      />
    );
    const editButton = screen.getByRole('button', { name: '' });
    fireEvent.click(editButton);
    const input = screen.getByDisplayValue('London');
    expect(input).toBeTruthy();
  });

  it('displays timezone identifier', () => {
    render(
      <TimeZoneCard
        timeZone={mockTimeZone}
        currentTime={currentTime}
        settings={mockSettings}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        isDarkMode={false}
      />
    );
    expect(screen.getByText('Europe/London')).toBeTruthy();
  });

  it('displays UTC offset', () => {
    render(
      <TimeZoneCard
        timeZone={mockTimeZone}
        currentTime={currentTime}
        settings={mockSettings}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        isDarkMode={false}
      />
    );
    const offsetText = screen.getByText((content, element) => {
      return /UTC\+?-?\d+/.test(content);
    });
    expect(offsetText).toBeTruthy();
  });
});
