import React from 'react';
import { StatedOrInferred } from '../../lib/types.js';

interface StatedLabelProps {
  type: StatedOrInferred;
}

export const StatedLabel: React.FC<StatedLabelProps> = ({ type }) => {
  const isStated = type === 'stated';
  const tooltip = isStated
    ? 'The evidence directly says this.'
    : 'Reasoned from the diff or context.';

  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border ${
        isStated
          ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
          : 'text-zinc-400 bg-zinc-800/50 border-zinc-700/50'
      }`}
      title={tooltip}
    >
      {type}
    </span>
  );
};
