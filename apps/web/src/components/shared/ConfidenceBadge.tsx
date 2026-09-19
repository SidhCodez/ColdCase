import React from 'react';
import { ConfidenceTier } from '../../lib/types.js';

interface ConfidenceBadgeProps {
  tier: ConfidenceTier;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ tier }) => {
  const config = {
    HIGH: { label: 'High', icon: '●', colorClass: 'text-conf-high bg-conf-high-bg border-conf-high/30' },
    MEDIUM: { label: 'Medium', icon: '◐', colorClass: 'text-conf-medium bg-conf-medium-bg border-conf-medium/30' },
    LOW: { label: 'Low', icon: '○', colorClass: 'text-conf-low bg-conf-low-bg border-conf-low/30' },
    NONE: { label: 'None', icon: '—', colorClass: 'text-conf-none bg-conf-none-bg border-conf-none/30' },
  }[tier];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${config.colorClass}`}
      aria-label={`Confidence: ${config.label}`}
      title={`Confidence tier: ${config.label}`}
    >
      <span className="font-mono leading-none">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};
