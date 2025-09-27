import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IallaLogo } from '../IallaLogo';

describe('IallaLogo', () => {
  it('renders with default size (md)', () => {
    const { container } = render(<IallaLogo />);
    const logoContainer = container.querySelector('.bg-gradient-to-br');
    const icon = container.querySelector('svg');
    
    expect(logoContainer).toBeInTheDocument();
    expect(logoContainer).toHaveClass('w-12', 'h-12');
    expect(icon).toHaveClass('w-6', 'h-6');
  });

  it('renders with sm size', () => {
    const { container } = render(<IallaLogo size="sm" />);
    const logoContainer = container.querySelector('.bg-gradient-to-br');
    const icon = container.querySelector('svg');
    
    expect(logoContainer).toHaveClass('w-8', 'h-8');
    expect(icon).toHaveClass('w-4', 'h-4');
  });

  it('renders with lg size', () => {
    const { container } = render(<IallaLogo size="lg" />);
    const logoContainer = container.querySelector('.bg-gradient-to-br');
    const icon = container.querySelector('svg');
    
    expect(logoContainer).toHaveClass('w-16', 'h-16');
    expect(icon).toHaveClass('w-8', 'h-8');
  });

  it('applies custom className', () => {
    const { container } = render(<IallaLogo className="custom-class" />);
    const wrapper = container.firstChild;
    
    expect(wrapper).toHaveClass('custom-class');
  });

  it('renders Ialla text by default', () => {
    render(<IallaLogo />);
    
    expect(screen.getByText('Ialla')).toBeInTheDocument();
  });

  it('hides text when showText is false', () => {
    render(<IallaLogo showText={false} />);
    
    expect(screen.queryByText('Ialla')).not.toBeInTheDocument();
  });
});