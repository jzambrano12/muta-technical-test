import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes', () => {
    const { rerender } = render(<Button variant="primary">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary-600');
    
    rerender(<Button variant="secondary">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-600');
    
    rerender(<Button variant="outline">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-gray-300');
  });

  it('applies size classes', () => {
    const { rerender } = render(<Button size="sm">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5');
    
    rerender(<Button size="md">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2');
    
    rerender(<Button size="lg">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3');
  });

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Submit</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('opacity-50', 'cursor-not-allowed');
  });
});