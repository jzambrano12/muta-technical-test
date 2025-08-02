import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/router';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'languageSwitcher': 'Language',
    'spanish': 'Spanish',
    'english': 'English',
  };
  return translations[key] || key;
};

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

interface MockSelectProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}

jest.mock('@muta/ui', () => ({
  Select: ({ label, options, value, onChange, className }: MockSelectProps) => (
    <div className={className}>
      <label>{label}</label>
      <select value={value} onChange={onChange} data-testid="language-select">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      pathname: '/dashboard',
      asPath: '/dashboard?tab=orders',
      locale: 'es',
      push: mockPush,
    });
  });

  it('renders language switcher with correct label', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByTestId('language-select')).toBeInTheDocument();
  });

  it('displays current locale as selected value', () => {
    render(<LanguageSwitcher />);

    const select = screen.getByTestId('language-select') as HTMLSelectElement;
    expect(select.value).toBe('es');
  });

  it('includes both language options', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByText('Spanish')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('calls router.push with new locale when language is changed', () => {
    render(<LanguageSwitcher />);

    const select = screen.getByTestId('language-select');
    fireEvent.change(select, { target: { value: 'en' } });

    expect(mockPush).toHaveBeenCalledWith(
      '/dashboard',
      '/dashboard?tab=orders',
      { locale: 'en' }
    );
  });

  it('defaults to es locale when router.locale is undefined', () => {
    (useRouter as jest.Mock).mockReturnValue({
      pathname: '/dashboard',
      asPath: '/dashboard',
      locale: undefined,
      push: mockPush,
    });

    render(<LanguageSwitcher />);

    const select = screen.getByTestId('language-select') as HTMLSelectElement;
    expect(select.value).toBe('es');
  });

  it('applies correct styling classes', () => {
    render(<LanguageSwitcher />);

    const container = screen.getByTestId('language-select').parentElement;
    expect(container).toHaveClass('text-sm');
  });
});