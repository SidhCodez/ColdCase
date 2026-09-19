import React from 'react';

interface HonestyBannerProps {
  variant: 'sampled' | 'low-evidence' | 'case-limited';
  n?: number;
  m?: number;
}

export const HonestyBanner: React.FC<HonestyBannerProps> = ({ variant, n, m }) => {
  const content = {
    sampled: {
      icon: '~',
      text: 'This story is based on a sample of the file\'s history.',
    },
    'low-evidence': {
      icon: '?',
      text: 'This file has little recorded reasoning. ColdCase is showing what it found, not guessing.',
    },
    'case-limited': {
      icon: '#',
      text: `This case covers the top ${n || 10} of ${m || 10} files.`,
    },
  }[variant];

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-bg-raised border border-border-subtle rounded-md text-xs text-fg-secondary my-3">
      <span className="font-mono text-fg-tertiary font-bold">{content.icon}</span>
      <span>{content.text}</span>
    </div>
  );
};
