import React from 'react';
import { ConfidenceTier } from '../../lib/types.js';

interface ConfidenceMixBarProps {
  mix: Record<ConfidenceTier, number>;
}

export const ConfidenceMixBar: React.FC<ConfidenceMixBarProps> = ({ mix }) => {
  const total = (mix.HIGH || 0) + (mix.MEDIUM || 0) + (mix.LOW || 0) + (mix.NONE || 0) || 1;
  const highPct = ((mix.HIGH || 0) / total) * 100;
  const medPct = ((mix.MEDIUM || 0) / total) * 100;
  const lowPct = ((mix.LOW || 0) / total) * 100;
  const nonePct = ((mix.NONE || 0) / total) * 100;

  return (
    <div className="w-full">
      <div className="h-2 w-full bg-bg-raised rounded-full overflow-hidden flex">
        {highPct > 0 && <div style={{ width: `${highPct}%` }} className="bg-conf-high h-full" title={`High: ${mix.HIGH}`} />}
        {medPct > 0 && <div style={{ width: `${medPct}%` }} className="bg-conf-medium h-full" title={`Medium: ${mix.MEDIUM}`} />}
        {lowPct > 0 && <div style={{ width: `${lowPct}%` }} className="bg-conf-low h-full" title={`Low: ${mix.LOW}`} />}
        {nonePct > 0 && <div style={{ width: `${nonePct}%` }} className="bg-conf-none h-full" title={`None: ${mix.NONE}`} />}
      </div>
      <div className="flex gap-3 text-[11px] text-fg-tertiary mt-1.5 font-mono">
        <span className="text-conf-high font-medium">● {mix.HIGH || 0} High</span>
        <span className="text-conf-medium font-medium">◐ {mix.MEDIUM || 0} Med</span>
        <span className="text-conf-low font-medium">○ {mix.LOW || 0} Low</span>
        <span className="text-conf-none font-medium">— {mix.NONE || 0} None</span>
      </div>
    </div>
  );
};
