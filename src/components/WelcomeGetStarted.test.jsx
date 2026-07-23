import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WelcomeGetStarted } from './WelcomeGetStarted.jsx';

const features = [{ icon: null, title: 'Find verified workers', desc: 'Browse.' }];

describe('WelcomeGetStarted', () => {
  it('greets the user by first name', () => {
    render(<WelcomeGetStarted name="Nicole Mukundwa" features={features} actions={[]} onSkip={() => {}} />);
    expect(screen.getByText('Welcome, Nicole!')).toBeInTheDocument();
    expect(screen.getByText('Find verified workers')).toBeInTheDocument();
  });

  it('fires the action CTA onClick', async () => {
    const onClick = vi.fn();
    render(<WelcomeGetStarted name="A" features={[]} actions={[{ icon: null, title: 'Browse workers', desc: 'x', cta: 'Get started', onClick }]} onSkip={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('fires onSkip from the skip link', async () => {
    const onSkip = vi.fn();
    render(<WelcomeGetStarted name="A" features={[]} actions={[]} onSkip={onSkip} />);
    await userEvent.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('falls back to a friendly greeting with no name', () => {
    render(<WelcomeGetStarted features={[]} actions={[]} onSkip={() => {}} />);
    expect(screen.getByText('Welcome, there!')).toBeInTheDocument();
  });
});
