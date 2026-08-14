import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const Header = () => (
  <header>
    <h1>مؤسسة الهواري للمحاماة</h1>
    <nav>
      <a href="#services">الخدمات</a>
      <a href="#team">الفريق</a>
      <a href="#contact">تواصل معنا</a>
    </nav>
  </header>
);

describe('Header Component', () => {
  it('renders the firm name correctly', () => {
    render(<Header />);
    const heading = screen.getByText('مؤسسة الهواري للمحاماة');
    expect(heading).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<Header />);
    expect(screen.getByText('الخدمات')).toBeInTheDocument();
    expect(screen.getByText('الفريق')).toBeInTheDocument();
    expect(screen.getByText('تواصل معنا')).toBeInTheDocument();
  });

  it('navigation links have correct href attributes', () => {
    render(<Header />);
    expect(screen.getByText('الخدمات')).toHaveAttribute('href', '#services');
    expect(screen.getByText('الفريق')).toHaveAttribute('href', '#team');
    expect(screen.getByText('تواصل معنا')).toHaveAttribute('href', '#contact');
  });
});